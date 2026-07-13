"""Admin routes for requests and auth keys."""
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from core.supabase_client import get_supabase
from core.auth_keys import hash_auth_key
from core.email_notify import notify_account_approved, notify_account_rejected
from core.db_helpers import require_updated
from core.security import invalidate_user_cache
from routes.deps import (
    require_admin,
    require_institutional,
    is_platform_admin,
    effective_institution_id,
    is_institution_admin,
)

router = APIRouter(prefix="/admin", tags=["admin"])


def _admin_scope_institution(admin: dict) -> str | None:
    """Institución que un admin puede administrar. None = acceso global (platform admin)."""
    if is_platform_admin(admin):
        return None
    return admin.get("institution_id")


class RejectBody(BaseModel):
    reason: str


class AuthKeyCreate(BaseModel):
    institution_id: str
    role: str
    label: str | None = None
    max_uses: int = 1
    expires_at: str | None = None


@router.get("/requests")
async def list_requests(
    admin: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    sb = get_supabase()
    query = sb.table("registration_requests").select(
        "*, users!registration_requests_user_id_fkey(full_name, email), institutions(name)"
    ).eq("status", "pending")
    inst = effective_institution_id(admin, institution_id)
    if inst:
        query = query.eq("institution_id", inst)
    elif admin.get("institution_id") and not is_platform_admin(admin):
        query = query.eq("institution_id", admin["institution_id"])
    result = query.order("created_at").execute()
    return result.data or []


@router.post("/requests/{request_id}/approve")
async def approve_request(request_id: str, admin: dict = Depends(require_institutional)):
    sb = get_supabase()
    req = sb.table("registration_requests").select("*").eq("id", request_id).single().execute()
    if not req.data or req.data["status"] != "pending":
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    data = req.data
    if admin.get("institution_id") and not is_platform_admin(admin):
        if data.get("institution_id") != admin["institution_id"]:
            raise HTTPException(status_code=403, detail="Solicitud fuera de su institución")
    elif is_platform_admin(admin) and admin.get("institution_id") is None:
        pass  # platform admin global

    if not data.get("institution_id"):
        raise HTTPException(status_code=400, detail="La solicitud no tiene institución asignada")

    now = datetime.now(timezone.utc).isoformat()

    user_update = sb.table("users").update({
        "status": "approved",
        "role": data["requested_role"],
        "institution_id": data["institution_id"],
        "updated_at": now,
    }).eq("id", data["user_id"]).select("id, status").execute()
    require_updated(user_update, "usuario")

    req_update = sb.table("registration_requests").update({
        "status": "approved",
        "reviewed_by": admin["id"],
        "reviewed_at": now,
    }).eq("id", request_id).select("id, status").execute()
    require_updated(req_update, "solicitud")

    if data.get("auth_key_id"):
        key_row = sb.table("role_auth_keys").select("uses_count").eq("id", data["auth_key_id"]).single().execute()
        if key_row.data:
            sb.table("role_auth_keys").update({
                "uses_count": key_row.data["uses_count"] + 1,
            }).eq("id", data["auth_key_id"]).execute()

    user_row = sb.table("users").select("email, full_name").eq("id", data["user_id"]).single().execute()
    if user_row.data and user_row.data.get("email"):
        await notify_account_approved(
            user_row.data["email"],
            user_row.data.get("full_name") or user_row.data["email"].split("@")[0],
            data["requested_role"],
        )

    invalidate_user_cache(data["user_id"])
    return {"status": "approved"}


@router.post("/requests/{request_id}/reject")
async def reject_request(request_id: str, body: RejectBody, admin: dict = Depends(require_institutional)):
    sb = get_supabase()
    req = sb.table("registration_requests").select("*").eq("id", request_id).single().execute()
    if not req.data or req.data["status"] != "pending":
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    if admin.get("institution_id") and not is_platform_admin(admin):
        if req.data.get("institution_id") != admin["institution_id"]:
            raise HTTPException(status_code=403, detail="Solicitud fuera de su institución")

    now = datetime.now(timezone.utc).isoformat()
    user_update = sb.table("users").update({"status": "rejected", "updated_at": now}).eq("id", req.data["user_id"]).select("id, status").execute()
    require_updated(user_update, "usuario")
    req_update = sb.table("registration_requests").update({
        "status": "rejected",
        "rejection_reason": body.reason,
        "reviewed_by": admin["id"],
        "reviewed_at": now,
    }).eq("id", request_id).select("id, status").execute()
    require_updated(req_update, "solicitud")

    user_row = sb.table("users").select("email, full_name").eq("id", req.data["user_id"]).single().execute()
    if user_row.data and user_row.data.get("email"):
        await notify_account_rejected(
            user_row.data["email"],
            user_row.data.get("full_name") or user_row.data["email"].split("@")[0],
            body.reason,
        )

    return {"status": "rejected"}


@router.get("/auth-keys")
async def list_auth_keys(
    admin: dict = Depends(require_admin),
    institution_id: str | None = Query(None),
):
    sb = get_supabase()
    query = sb.table("role_auth_keys").select(
        "id, institution_id, role, label, max_uses, uses_count, expires_at, revoked_at, created_at, institutions(name)"
    )
    inst = effective_institution_id(admin, institution_id)
    if inst:
        query = query.eq("institution_id", inst)
    elif admin.get("institution_id") and not is_platform_admin(admin):
        query = query.eq("institution_id", admin["institution_id"])
    result = query.order("created_at", desc=True).execute()
    return result.data or []


@router.post("/auth-keys")
async def create_auth_key(body: AuthKeyCreate, admin: dict = Depends(require_admin)):
    if body.role not in ("area_head", "dean", "vice_president", "rector", "admin"):
        raise HTTPException(status_code=400, detail="Rol inválido")

    if is_institution_admin(admin) and admin.get("institution_id"):
        if body.institution_id != admin["institution_id"]:
            raise HTTPException(status_code=403, detail="No puede crear claves para otra institución")

    plain_key = f"BOL-{body.role.upper()[:3]}-{secrets.token_urlsafe(8).upper()}"
    sb = get_supabase()
    result = sb.table("role_auth_keys").insert({
        "institution_id": body.institution_id,
        "role": body.role,
        "key_hash": hash_auth_key(plain_key),
        "label": body.label or f"Clave {body.role}",
        "max_uses": body.max_uses,
        "expires_at": body.expires_at,
        "created_by": admin["id"],
    }).execute()

    return {"id": result.data[0]["id"], "auth_key": plain_key, "message": "Guarde esta clave; no se mostrará de nuevo."}


@router.delete("/auth-keys/{key_id}")
async def revoke_auth_key(key_id: str, admin: dict = Depends(require_admin)):
    sb = get_supabase()
    key = sb.table("role_auth_keys").select("id, institution_id").eq("id", key_id).single().execute()
    if not key.data:
        raise HTTPException(status_code=404, detail="Clave no encontrada")
    scope = _admin_scope_institution(admin)
    if scope is not None and key.data.get("institution_id") != scope:
        raise HTTPException(status_code=403, detail="Clave fuera de su institución")
    now = datetime.now(timezone.utc).isoformat()
    sb.table("role_auth_keys").update({"revoked_at": now}).eq("id", key_id).execute()
    return {"status": "revoked"}


@router.get("/security-events")
async def list_security_events(admin: dict = Depends(require_admin)):
    sb = get_supabase()
    query = sb.table("security_events").select("*")
    scope = _admin_scope_institution(admin)
    if scope is not None:
        inst_users = sb.table("users").select("id").eq("institution_id", scope).execute()
        user_ids = [u["id"] for u in inst_users.data or []]
        if not user_ids:
            return []
        query = query.in_("user_id", user_ids)
    result = query.order("created_at", desc=True).limit(100).execute()
    return result.data or []


@router.get("/sessions")
async def list_sessions(
    admin: dict = Depends(require_admin),
    institution_id: str | None = Query(None),
):
    sb = get_supabase()
    query = sb.table("user_sessions").select(
        "*, users!user_sessions_user_id_fkey(full_name, email)"
    ).eq("is_active", True)
    inst = effective_institution_id(admin, institution_id)
    if inst:
        inst_users = sb.table("users").select("id").eq("institution_id", inst).execute()
        user_ids = [u["id"] for u in inst_users.data or []]
        if user_ids:
            query = query.in_("user_id", user_ids)
        else:
            return []
    elif admin.get("institution_id") and not is_platform_admin(admin):
        inst_users = sb.table("users").select("id").eq("institution_id", admin["institution_id"]).execute()
        user_ids = [u["id"] for u in inst_users.data or []]
        if user_ids:
            query = query.in_("user_id", user_ids)
        else:
            return []
    result = query.execute()
    return result.data or []


@router.post("/sessions/{session_id}/revoke")
async def revoke_session(session_id: str, admin: dict = Depends(require_admin)):
    sb = get_supabase()
    session = sb.table("user_sessions").select("id, user_id").eq("id", session_id).single().execute()
    if not session.data:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    scope = _admin_scope_institution(admin)
    if scope is not None:
        owner = sb.table("users").select("institution_id").eq("id", session.data["user_id"]).single().execute()
        if not owner.data or owner.data.get("institution_id") != scope:
            raise HTTPException(status_code=403, detail="Sesión fuera de su institución")
    now = datetime.now(timezone.utc).isoformat()
    sb.table("user_sessions").update({
        "is_active": False,
        "revoked_at": now,
        "revoked_by": admin["id"],
    }).eq("id", session_id).execute()
    return {"status": "revoked"}


class ProgramCreate(BaseModel):
    name: str
    description: str | None = None
    faculty_id: str | None = None


class ResourceCreate(BaseModel):
    title: str
    description: str | None = None
    url: str
    topic: str | None = None
    category: str | None = None
    resource_type: str = "link"


class ResourcePatch(BaseModel):
    title: str | None = None
    description: str | None = None
    url: str | None = None
    topic: str | None = None
    category: str | None = None
    resource_type: str | None = None
    is_active: bool | None = None


@router.get("/programs")
async def admin_list_programs(
    admin: dict = Depends(require_admin),
    institution_id: str | None = Query(None),
):
    sb = get_supabase()
    inst = effective_institution_id(admin, institution_id)
    query = sb.table("academic_programs").select("*, program_curricula(*)")
    if inst:
        query = query.eq("institution_id", inst)
    return query.order("name").execute().data or []


@router.post("/programs")
async def admin_create_program(
    body: ProgramCreate,
    admin: dict = Depends(require_admin),
    institution_id: str | None = Query(None),
):
    inst = effective_institution_id(admin, institution_id)
    if not inst:
        raise HTTPException(status_code=400, detail="Seleccione una institución")
    sb = get_supabase()
    result = sb.table("academic_programs").insert({
        "institution_id": inst,
        "name": body.name,
        "description": body.description,
        "faculty_id": body.faculty_id,
        "is_active": True,
    }).execute()
    return result.data[0]


def _assert_program_in_scope(sb, program_id: str, admin: dict) -> None:
    program = sb.table("academic_programs").select("id, institution_id").eq("id", program_id).single().execute()
    if not program.data:
        raise HTTPException(status_code=404, detail="Programa no encontrado")
    scope = _admin_scope_institution(admin)
    if scope is not None and program.data.get("institution_id") != scope:
        raise HTTPException(status_code=403, detail="Programa fuera de su institución")


@router.patch("/programs/{program_id}")
async def admin_update_program(program_id: str, body: ProgramCreate, admin: dict = Depends(require_admin)):
    sb = get_supabase()
    _assert_program_in_scope(sb, program_id, admin)
    sb.table("academic_programs").update({
        "name": body.name,
        "description": body.description,
        "faculty_id": body.faculty_id,
    }).eq("id", program_id).execute()
    return {"updated": True}


@router.delete("/programs/{program_id}")
async def admin_delete_program(program_id: str, admin: dict = Depends(require_admin)):
    sb = get_supabase()
    _assert_program_in_scope(sb, program_id, admin)
    sb.table("academic_programs").update({"is_active": False}).eq("id", program_id).execute()
    return {"deleted": True}


@router.post("/scraper/run")
async def run_scraper(
    admin: dict = Depends(require_admin),
    institution_id: str | None = Query(None),
    target: str = Query("general", description="general | utb_biblioteca"),
):
    from services.resource_scraper import search_external, scrape_utb_biblioteca
    inst = effective_institution_id(admin, institution_id)
    if target == "utb_biblioteca":
        results = await scrape_utb_biblioteca(inst)
    else:
        results = await search_external("programación python", inst)
    return {"indexed": len(results), "target": target}


@router.get("/resources")
async def admin_list_resources(
    admin: dict = Depends(require_admin),
    institution_id: str | None = Query(None),
):
    sb = get_supabase()
    inst = effective_institution_id(admin, institution_id)
    query = sb.table("resources").select("*").order("created_at", desc=True)
    if inst:
        query = query.eq("institution_id", inst)
    return query.limit(200).execute().data or []


@router.post("/resources")
async def admin_create_resource(
    body: ResourceCreate,
    admin: dict = Depends(require_admin),
    institution_id: str | None = Query(None),
):
    inst = effective_institution_id(admin, institution_id)
    if not inst:
        raise HTTPException(status_code=400, detail="Institución requerida")
    sb = get_supabase()
    result = sb.table("resources").insert({
        "institution_id": inst,
        "title": body.title,
        "description": body.description,
        "url": body.url,
        "topic": body.topic,
        "category": body.category,
        "resource_type": body.resource_type,
        "source": "admin",
    }).execute()
    return result.data[0]


@router.patch("/resources/{resource_id}")
async def admin_update_resource(
    resource_id: str,
    body: ResourcePatch,
    admin: dict = Depends(require_admin),
):
    sb = get_supabase()
    existing = sb.table("resources").select("id, institution_id").eq("id", resource_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    scope = _admin_scope_institution(admin)
    if scope is not None and existing.data.get("institution_id") != scope:
        raise HTTPException(status_code=403, detail="Recurso fuera de su institución")
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Sin cambios")
    sb.table("resources").update(updates).eq("id", resource_id).execute()
    return {"updated": True}


@router.delete("/resources/{resource_id}")
async def admin_delete_resource(resource_id: str, admin: dict = Depends(require_admin)):
    sb = get_supabase()
    existing = sb.table("resources").select("id, institution_id").eq("id", resource_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    scope = _admin_scope_institution(admin)
    if scope is not None and existing.data.get("institution_id") != scope:
        raise HTTPException(status_code=403, detail="Recurso fuera de su institución")
    sb.table("resources").delete().eq("id", resource_id).execute()
    return {"deleted": True}


@router.get("/reports/weekly-data")
async def weekly_report_data(
    admin: dict = Depends(require_admin),
    institution_id: str | None = Query(None),
):
    from services.analytics_service import compute_dashboard
    inst = effective_institution_id(admin, institution_id)
    return compute_dashboard({**admin, "institution_id": inst})
