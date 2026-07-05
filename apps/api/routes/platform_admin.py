"""Platform admin routes — global institutions and users."""
import re
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, EmailStr
from core.supabase_client import get_supabase
from core.parallel import run_parallel
from core.username import is_valid_username, normalize_username
from routes.deps import require_platform_admin

router = APIRouter(prefix="/platform", tags=["platform"])


class InstitutionCreate(BaseModel):
    name: str
    slug: str
    manager_email: EmailStr
    manager_password: str
    manager_full_name: str
    manager_username: str | None = None


def _unique_username(sb, preferred: str) -> str:
    """Deriva un username válido y único (login es por username→email)."""
    cleaned = re.sub(r"[^a-z0-9_]", "", normalize_username(preferred or ""))
    if not cleaned or not cleaned[0].isalpha():
        cleaned = f"gestor{cleaned}"
    cleaned = cleaned[:28]
    while len(cleaned) < 3:
        cleaned += "0"
    base = cleaned
    candidate = base
    suffix = 0
    while True:
        if is_valid_username(candidate):
            existing = sb.table("users").select("id").eq("username", candidate).limit(1).execute()
            if not existing.data:
                return candidate
        suffix += 1
        candidate = f"{base[:26]}{suffix}"


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
    sb = get_supabase()

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
    unlinked = 0
    for u in users:
        if u.get("institution_id"):
            iid = u["institution_id"]
            by_institution[iid] = by_institution.get(iid, 0) + 1
        elif u.get("role") not in ("platform_admin",):
            unlinked += 1

    return {
        "total_users": len(users),
        "total_institutions": len(institutions),
        "active_institutions": sum(1 for i in institutions if i.get("is_active")),
        "pending_requests": len(pending),
        "unlinked_users": unlinked,
        "users_by_institution": by_institution,
        "recent_users": sorted(users, key=lambda x: x.get("created_at") or "", reverse=True)[:10],
    }


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
    sb.table("users").update(updates).eq("id", user_id).execute()
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
    slug = _slugify(body.slug or body.name)
    if not slug:
        raise HTTPException(status_code=400, detail="Slug inválido")
    if len(body.manager_password) < 8:
        raise HTTPException(status_code=400, detail="Contraseña del gestor debe tener al menos 8 caracteres")

    sb = get_supabase()

    existing = sb.table("institutions").select("id").eq("slug", slug).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Ya existe una institución con ese slug")

    inst_result = sb.table("institutions").insert({
        "name": body.name,
        "slug": slug,
        "is_active": True,
        "managed_by": admin["id"],
    }).execute()
    institution = inst_result.data[0]

    try:
        auth_resp = sb.auth.admin.create_user({
            "email": body.manager_email,
            "password": body.manager_password,
            "email_confirm": True,
            "user_metadata": {"full_name": body.manager_full_name},
        })
    except Exception as e:
        sb.table("institutions").delete().eq("id", institution["id"]).execute()
        raise HTTPException(status_code=400, detail=f"No se pudo crear el gestor: {e}")

    manager_user = auth_resp.user
    if not manager_user:
        sb.table("institutions").delete().eq("id", institution["id"]).execute()
        raise HTTPException(status_code=500, detail="Error al crear usuario gestor")

    preferred_username = body.manager_username or body.manager_email.split("@")[0]
    manager_username = _unique_username(sb, preferred_username)

    sb.table("users").upsert({
        "id": manager_user.id,
        "email": body.manager_email,
        "username": manager_username,
        "full_name": body.manager_full_name,
        "role": "admin",
        "status": "approved",
        "institution_id": institution["id"],
    }, on_conflict="id").execute()

    return {
        "institution": institution,
        "manager": {"id": manager_user.id, "email": body.manager_email, "username": manager_username},
    }


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
