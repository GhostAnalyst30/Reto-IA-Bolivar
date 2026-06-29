"""Registration routes."""
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel, EmailStr
from core.supabase_client import get_supabase
from core.auth_keys import verify_auth_key, is_key_valid
from core.security_monitor import log_security_event

router = APIRouter(tags=["register"])


class StudentRegister(BaseModel):
    user_id: str
    email: EmailStr
    full_name: str
    institution_id: str


class InstitutionalRegister(BaseModel):
    user_id: str
    email: EmailStr
    full_name: str
    institution_id: str
    requested_role: str
    auth_key: str


@router.get("/institutions")
async def list_institutions():
    try:
        sb = get_supabase()
        result = sb.table("institutions").select("id, name, slug").eq("is_active", True).execute()
        return result.data or []
    except Exception:
        return [{
            "id": "a0000000-0000-4000-8000-000000000001",
            "name": "Universidad Bolívar Demo",
            "slug": "uni-bolivar-demo",
        }]


@router.post("/register/student")
async def register_student(body: StudentRegister, request: Request):
    sb = get_supabase()
    sb.table("users").update({
        "full_name": body.full_name,
        "institution_id": body.institution_id,
        "role": "student",
        "status": "pending",
    }).eq("id", body.user_id).execute()

    sb.table("registration_requests").upsert({
        "user_id": body.user_id,
        "institution_id": body.institution_id,
        "requested_role": "student",
        "status": "pending",
    }, on_conflict="user_id").execute()

    return {"status": "pending", "message": "Solicitud enviada. Espera aprobación del administrador."}


@router.post("/register/institutional")
async def register_institutional(body: InstitutionalRegister, request: Request):
    if body.requested_role not in ("area_head", "dean", "vice_president", "rector"):
        raise HTTPException(status_code=400, detail="Rol inválido")

    sb = get_supabase()
    keys = sb.table("role_auth_keys").select("*").eq(
        "institution_id", body.institution_id
    ).eq("role", body.requested_role).is_("revoked_at", "null").execute()

    matched_key = None
    for key in keys.data or []:
        if is_key_valid(key) and verify_auth_key(body.auth_key, key["key_hash"]):
            matched_key = key
            break

    if not matched_key:
        log_security_event(
            "invalid_auth_key",
            severity="high",
            user_id=body.user_id,
            ip_address=request.client.host if request.client else None,
            details={"role": body.requested_role, "email": body.email},
        )
        raise HTTPException(status_code=403, detail="Clave de autorización inválida o expirada")

    sb.table("users").update({
        "full_name": body.full_name,
        "institution_id": body.institution_id,
        "role": body.requested_role,
        "status": "pending",
    }).eq("id", body.user_id).execute()

    sb.table("registration_requests").upsert({
        "user_id": body.user_id,
        "institution_id": body.institution_id,
        "requested_role": body.requested_role,
        "status": "pending",
        "auth_key_id": matched_key["id"],
    }, on_conflict="user_id").execute()

    return {"status": "pending", "message": "Solicitud enviada. Un administrador revisará tu acceso."}
