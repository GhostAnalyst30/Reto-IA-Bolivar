"""Registration routes."""
from fastapi import APIRouter, Request, HTTPException, Header, Depends
from pydantic import BaseModel, EmailStr
from core.supabase_client import get_supabase
from core.auth_keys import verify_auth_key, is_key_valid
from core.security_monitor import log_security_event
from core.security import get_current_user
from core.config import settings
from core.username import is_valid_username, normalize_username, is_utb_email

router = APIRouter(tags=["register"])


def _validate_username_unique(sb, username: str) -> str:
    normalized = normalize_username(username)
    if not is_valid_username(normalized):
        raise HTTPException(
            status_code=400,
            detail="Usuario inválido: 3-30 caracteres, letra inicial, minúsculas/números/_",
        )
    existing = sb.table("users").select("id").eq("username", normalized).limit(1).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="El nombre de usuario ya está en uso")
    return normalized


def _validate_utb_email(email: str) -> None:
    if not is_utb_email(email):
        raise HTTPException(status_code=400, detail="El correo debe ser institucional @utb.edu.co")


class StudentRegister(BaseModel):
    user_id: str
    email: EmailStr
    username: str
    full_name: str
    institution_id: str | None = None


class InstitutionalRegister(BaseModel):
    user_id: str
    email: EmailStr
    username: str
    full_name: str
    institution_id: str
    requested_role: str
    auth_key: str


class LinkInstitutionBody(BaseModel):
    institution_id: str


def _assert_self(body_user_id: str, user: dict) -> None:
    if body_user_id != user["id"]:
        raise HTTPException(status_code=403, detail="user_id no coincide con la sesión")


def _validate_institution(sb, institution_id: str) -> None:
    inst = sb.table("institutions").select("id").eq("id", institution_id).eq("is_active", True).single().execute()
    if not inst.data:
        raise HTTPException(status_code=400, detail="Institución inválida o inactiva")


async def _verify_register_caller(
    body_user_id: str,
    body_email: str,
    authorization: str | None,
    x_internal_register_key: str | None,
) -> None:
    if authorization and authorization.startswith("Bearer "):
        user = await get_current_user(authorization)
        _assert_self(body_user_id, user)
        return

    if (
        x_internal_register_key
        and settings.internal_register_key
        and x_internal_register_key == settings.internal_register_key
    ):
        sb = get_supabase()
        auth_resp = sb.auth.admin.get_user_by_id(body_user_id)
        auth_user = auth_resp.user if auth_resp else None
        if not auth_user or auth_user.email.lower() != body_email.lower():
            raise HTTPException(status_code=403, detail="Usuario no verificado")
        return

    raise HTTPException(status_code=401, detail="Missing token")


@router.get("/institutions")
async def list_institutions():
    try:
        sb = get_supabase()
        result = sb.table("institutions").select("id, name, slug").eq("is_active", True).execute()
        return result.data or []
    except Exception:
        raise HTTPException(status_code=503, detail="No se pudieron cargar instituciones")


@router.post("/register/student")
async def register_student(
    body: StudentRegister,
    authorization: str | None = Header(None),
    x_internal_register_key: str | None = Header(None, alias="X-Internal-Register-Key"),
):
    await _verify_register_caller(body.user_id, body.email, authorization, x_internal_register_key)
    sb = get_supabase()
    _validate_utb_email(body.email)
    username = _validate_username_unique(sb, body.username)
    if body.institution_id:
        _validate_institution(sb, body.institution_id)

    sb.table("users").upsert({
        "id": body.user_id,
        "email": body.email,
        "username": username,
        "full_name": body.full_name,
        "institution_id": body.institution_id,
        "role": "student",
        "status": "pending",
    }, on_conflict="id").execute()

    sb.table("registration_requests").upsert({
        "user_id": body.user_id,
        "institution_id": body.institution_id,
        "requested_role": "student",
        "status": "pending",
    }, on_conflict="user_id").execute()

    return {"status": "pending", "message": "Solicitud enviada. Espera aprobación del administrador."}


@router.post("/register/link-institution")
async def link_institution(
    body: LinkInstitutionBody,
    user: dict = Depends(get_current_user),
):
    if user.get("role") != "student":
        raise HTTPException(status_code=400, detail="Solo estudiantes pueden vincular institución")
    if user.get("status") == "approved" and user.get("institution_id"):
        raise HTTPException(status_code=400, detail="Ya tienes una institución vinculada")

    sb = get_supabase()
    _validate_institution(sb, body.institution_id)

    sb.table("users").update({
        "institution_id": body.institution_id,
        "status": "pending",
    }).eq("id", user["id"]).execute()

    sb.table("registration_requests").upsert({
        "user_id": user["id"],
        "institution_id": body.institution_id,
        "requested_role": "student",
        "status": "pending",
    }, on_conflict="user_id").execute()

    return {"status": "pending", "message": "Solicitud enviada. Espera aprobación del administrador."}


@router.post("/register/institutional")
async def register_institutional(
    body: InstitutionalRegister,
    request: Request,
    authorization: str | None = Header(None),
    x_internal_register_key: str | None = Header(None, alias="X-Internal-Register-Key"),
):
    await _verify_register_caller(body.user_id, body.email, authorization, x_internal_register_key)

    if body.requested_role not in ("area_head", "dean", "vice_president", "rector"):
        raise HTTPException(status_code=400, detail="Rol inválido")

    sb = get_supabase()
    _validate_utb_email(body.email)
    username = _validate_username_unique(sb, body.username)
    _validate_institution(sb, body.institution_id)

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

    sb.table("users").upsert({
        "id": body.user_id,
        "email": body.email,
        "username": username,
        "full_name": body.full_name,
        "institution_id": body.institution_id,
        "role": body.requested_role,
        "status": "pending",
    }, on_conflict="id").execute()

    sb.table("registration_requests").upsert({
        "user_id": body.user_id,
        "institution_id": body.institution_id,
        "requested_role": body.requested_role,
        "status": "pending",
        "auth_key_id": matched_key["id"],
    }, on_conflict="user_id").execute()

    return {"status": "pending", "message": "Solicitud enviada. Un administrador revisará tu acceso."}
