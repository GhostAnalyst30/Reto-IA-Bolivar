"""Platform admin routes — global institutions and users."""
import json
import re
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, EmailStr
from core.cache import platform_cache
from core.supabase_client import get_supabase
from core.parallel import run_parallel
from core.security import invalidate_user_cache
from routes.deps import require_platform_admin

router = APIRouter(prefix="/platform", tags=["platform"])


class InstitutionCreate(BaseModel):
    name: str
    slug: str
    manager_email: EmailStr
    manager_password: str
    manager_full_name: str


class InstitutionPatch(BaseModel):
    is_active: bool | None = None
    name: str | None = None


class UserPatch(BaseModel):
    status: str | None = None
    role: str | None = None


def _slugify(value: str) -> str:
    s = value.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


@router.get("/dashboard")
async def platform_dashboard(admin: dict = Depends(require_platform_admin)):
    cached = platform_cache.get("dashboard")
    if cached is not None:
        return cached

    sb = get_supabase()

    try:
        stats_res = sb.rpc("platform_dashboard_stats").execute()
        stats = stats_res.data or {}
    except Exception:
        stats = {}

    if stats:
        def fetch_recent():
            return sb.table("users").select(
                "id, role, status, institution_id, email, full_name, created_at"
            ).order("created_at", desc=True).limit(10).execute()

        recent_res = fetch_recent()
        recent_users = recent_res.data or []
        by_role = stats.get("users_by_role") or {}
        by_institution = stats.get("users_by_institution") or {}
        if isinstance(by_role, str):
            by_role = json.loads(by_role)
        if isinstance(by_institution, str):
            by_institution = json.loads(by_institution)

        result = {
            "total_users": int(stats.get("total_users") or 0),
            "total_institutions": int(stats.get("total_institutions") or 0),
            "active_institutions": int(stats.get("active_institutions") or 0),
            "pending_requests": int(stats.get("pending_requests") or 0),
            "unlinked_users": int(stats.get("unlinked_users") or 0),
            "users_by_institution": by_institution,
            "users_by_role": by_role,
            "recent_users": recent_users,
        }
        platform_cache.set("dashboard", result)
        return result

    def fetch_users():
        return sb.table("users").select("id, role, status, institution_id, email, full_name, created_at").execute()

    def fetch_institutions():
        return sb.table("institutions").select("id, name, is_active").execute()

    def fetch_pending():
        return sb.table("registration_requests").select("id").eq("status", "pending").execute()

    users_res, institutions_res, pending_res = run_parallel(fetch_users, fetch_institutions, fetch_pending)
    users = users_res.data or []
    institutions = institutions_res.data or []
    pending = pending_res.data or []

    by_institution: dict[str, int] = {}
    by_role: dict[str, int] = {}
    unlinked = 0
    for u in users:
        r = u.get("role") or "unknown"
        by_role[r] = by_role.get(r, 0) + 1
        if u.get("institution_id"):
            iid = u["institution_id"]
            by_institution[iid] = by_institution.get(iid, 0) + 1
        elif u.get("role") not in ("platform_admin",):
            unlinked += 1

    result = {
        "total_users": len(users),
        "total_institutions": len(institutions),
        "active_institutions": sum(1 for i in institutions if i.get("is_active")),
        "pending_requests": len(pending),
        "unlinked_users": unlinked,
        "users_by_institution": by_institution,
        "users_by_role": by_role,
        "recent_users": sorted(users, key=lambda x: x.get("created_at") or "", reverse=True)[:10],
    }
    platform_cache.set("dashboard", result)
    return result


@router.get("/users")
async def platform_list_users(
    admin: dict = Depends(require_platform_admin),
    role: str | None = Query(None),
    status: str | None = Query(None),
    institution_id: str | None = Query(None),
    limit: int = Query(100, le=500),
):
    sb = get_supabase()
    query = sb.table("users").select("*")
    if role:
        query = query.eq("role", role)
    if status:
        query = query.eq("status", status)
    if institution_id:
        query = query.eq("institution_id", institution_id)
    result = query.order("created_at", desc=True).limit(limit).execute()
    users = result.data or []
    inst_ids = {u["institution_id"] for u in users if u.get("institution_id")}
    inst_map: dict[str, dict] = {}
    if inst_ids:
        inst_rows = sb.table("institutions").select("id, name").in_("id", list(inst_ids)).execute()
        inst_map = {r["id"]: r for r in (inst_rows.data or [])}
    for u in users:
        iid = u.get("institution_id")
        u["institutions"] = {"name": inst_map[iid]["name"]} if iid and iid in inst_map else None
    return users


@router.patch("/users/{user_id}")
async def platform_update_user(
    user_id: str,
    body: UserPatch,
    admin: dict = Depends(require_platform_admin),
):
    if body.status and body.status not in ("pending", "approved", "rejected", "suspended"):
        raise HTTPException(status_code=400, detail="Estado inválido")
    if body.role and body.role not in (
        "student", "area_head", "dean", "vice_president", "rector", "admin", "platform_admin"
    ):
        raise HTTPException(status_code=400, detail="Rol inválido")

    updates: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if body.status:
        updates["status"] = body.status
    if body.role:
        updates["role"] = body.role

    sb = get_supabase()
    result = sb.table("users").update(updates).eq("id", user_id).select("id, status").execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    invalidate_user_cache(user_id)
    platform_cache.invalidate("dashboard")

    if body.status in ("approved", "rejected"):
        req_updates: dict = {
            "status": "approved" if body.status == "approved" else "rejected",
            "reviewed_by": admin["id"],
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
        }
        if body.status == "rejected":
            req_updates["rejection_reason"] = "Actualizado por administrador de plataforma"
        sb.table("registration_requests").update(req_updates).eq("user_id", user_id).execute()

    return {"updated": True}


@router.get("/institutions")
async def platform_list_institutions(admin: dict = Depends(require_platform_admin)):
    sb = get_supabase()
    result = sb.table("institutions").select("*").order("created_at", desc=True).execute()
    return result.data or []


@router.post("/institutions")
async def platform_create_institution(
    body: InstitutionCreate,
    admin: dict = Depends(require_platform_admin),
):
    raise HTTPException(
        status_code=410,
        detail="La plataforma es exclusiva para UTB. No se pueden crear nuevas instituciones.",
    )


@router.patch("/institutions/{institution_id}")
async def platform_patch_institution(
    institution_id: str,
    body: InstitutionPatch,
    admin: dict = Depends(require_platform_admin),
):
    updates: dict = {}
    if body.is_active is not None:
        updates["is_active"] = body.is_active
    if body.name:
        updates["name"] = body.name
    if not updates:
        raise HTTPException(status_code=400, detail="Sin cambios")

    sb = get_supabase()
    sb.table("institutions").update(updates).eq("id", institution_id).execute()
    return {"updated": True}
