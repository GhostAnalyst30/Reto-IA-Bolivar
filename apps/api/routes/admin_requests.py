"""Admin routes for requests and auth keys."""
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from core.supabase_client import get_supabase
from core.auth_keys import hash_auth_key
from routes.deps import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


class RejectBody(BaseModel):
    reason: str


class AuthKeyCreate(BaseModel):
    institution_id: str
    role: str
    label: str | None = None
    max_uses: int = 1
    expires_at: str | None = None


@router.get("/requests")
async def list_requests(admin: dict = Depends(require_admin)):
    sb = get_supabase()
    result = sb.table("registration_requests").select(
        "*, users(full_name, email), institutions(name)"
    ).eq("status", "pending").order("created_at").execute()
    return result.data or []


@router.post("/requests/{request_id}/approve")
async def approve_request(request_id: str, admin: dict = Depends(require_admin)):
    sb = get_supabase()
    req = sb.table("registration_requests").select("*").eq("id", request_id).single().execute()
    if not req.data or req.data["status"] != "pending":
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    data = req.data
    now = datetime.now(timezone.utc).isoformat()

    sb.table("users").update({
        "status": "approved",
        "role": data["requested_role"],
        "institution_id": data["institution_id"],
        "updated_at": now,
    }).eq("id", data["user_id"]).execute()

    sb.table("registration_requests").update({
        "status": "approved",
        "reviewed_by": admin["id"],
        "reviewed_at": now,
    }).eq("id", request_id).execute()

    if data.get("auth_key_id"):
        key = sb.table("role_auth_keys").select("uses_count").eq("id", data["auth_key_id"]).single().execute()
        if key.data:
            sb.table("role_auth_keys").update({
                "uses_count": key.data["uses_count"] + 1,
            }).eq("id", data["auth_key_id"]).execute()

    return {"status": "approved"}


@router.post("/requests/{request_id}/reject")
async def reject_request(request_id: str, body: RejectBody, admin: dict = Depends(require_admin)):
    sb = get_supabase()
    req = sb.table("registration_requests").select("*").eq("id", request_id).single().execute()
    if not req.data:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    now = datetime.now(timezone.utc).isoformat()
    sb.table("users").update({"status": "rejected", "updated_at": now}).eq("id", req.data["user_id"]).execute()
    sb.table("registration_requests").update({
        "status": "rejected",
        "rejection_reason": body.reason,
        "reviewed_by": admin["id"],
        "reviewed_at": now,
    }).eq("id", request_id).execute()

    return {"status": "rejected"}


@router.get("/auth-keys")
async def list_auth_keys(admin: dict = Depends(require_admin)):
    sb = get_supabase()
    result = sb.table("role_auth_keys").select(
        "id, institution_id, role, label, max_uses, uses_count, expires_at, revoked_at, created_at, institutions(name)"
    ).order("created_at", desc=True).execute()
    return result.data or []


@router.post("/auth-keys")
async def create_auth_key(body: AuthKeyCreate, admin: dict = Depends(require_admin)):
    if body.role not in ("area_head", "dean", "vice_president", "rector"):
        raise HTTPException(status_code=400, detail="Rol inválido")

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
    now = datetime.now(timezone.utc).isoformat()
    sb.table("role_auth_keys").update({"revoked_at": now}).eq("id", key_id).execute()
    return {"status": "revoked"}


@router.get("/security-events")
async def list_security_events(admin: dict = Depends(require_admin)):
    sb = get_supabase()
    result = sb.table("security_events").select("*").order("created_at", desc=True).limit(100).execute()
    return result.data or []


@router.get("/sessions")
async def list_sessions(admin: dict = Depends(require_admin)):
    sb = get_supabase()
    result = sb.table("user_sessions").select("*, users(full_name, email)").eq("is_active", True).execute()
    return result.data or []


@router.post("/sessions/{session_id}/revoke")
async def revoke_session(session_id: str, admin: dict = Depends(require_admin)):
    sb = get_supabase()
    now = datetime.now(timezone.utc).isoformat()
    sb.table("user_sessions").update({
        "is_active": False,
        "revoked_at": now,
        "revoked_by": admin["id"],
    }).eq("id", session_id).execute()
    return {"status": "revoked"}
