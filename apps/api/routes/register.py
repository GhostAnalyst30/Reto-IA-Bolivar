"""Registration routes."""
from fastapi import APIRouter, Request, HTTPException, Header
from pydantic import BaseModel, EmailStr
from core.supabase_client import get_supabase
from core.auth_keys import verify_auth_key, is_key_valid
from core.security_monitor import log_security_event
from core.security import get_current_user
from core.config import settings
from core.username import is_utb_email

router = APIRouter(tags=["register"])

UTB_INSTITUTION_SLUG = "utb"
STAFF_ROLES = ("area_head", "dean", "vice_president", "rector", "admin")


def _validate_utb_email(email: str) -> None:
    if not is_utb_email(email):
        raise HTTPException(status_code=400, detail="El correo debe ser institucional @utb.edu.co")


def _get_utb_institution_id(sb) -> str:
    inst = (
        sb.table("institutions")
        .select("id")
        .eq("slug", UTB_INSTITUTION_SLUG)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    if not inst.data:
        raise HTTPException(status_code=503, detail="Institución UTB no configurada")
    return inst.data[0]["id"]


class StudentRegister(BaseModel):
    user_id: str
    email: EmailStr
    full_name: str


class InstitutionalRegister(BaseModel):
    user_id: str
    email: EmailStr
    full_name: str
    requested_role: str
    auth_key: str


def _assert_self(body_user_id: str, user: dict) -> None:
    if body_user_id != user["id"]:
        raise HTTPException(status_code=403, detail="user_id no coincide con la sesión")


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
    """Lista instituciones activas (solo lectura, p. ej. selectores admin)."""
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
    institution_id = _get_utb_institution_id(sb)

    sb.table("users").upsert({
        "id": body.user_id,
        "email": body.email,
        "full_name": body.full_name,
        "institution_id": institution_id,
        "role": "student",
        "status": "pending",
    }, on_conflict="id").execute()

    sb.table("registration_requests").upsert({
        "user_id": body.user_id,
        "institution_id": institution_id,
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

    if body.requested_role not in STAFF_ROLES:
        raise HTTPException(status_code=400, detail="Rol inválido")

    sb = get_supabase()
    _validate_utb_email(body.email)
    institution_id = _get_utb_institution_id(sb)

    keys = sb.table("role_auth_keys").select("*").eq(
        "institution_id", institution_id
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
        raise HTTPException(status_code=403, detail="Clave de registro inválida o expirada")

    sb.table("users").upsert({
        "id": body.user_id,
        "email": body.email,
        "full_name": body.full_name,
        "institution_id": institution_id,
        "role": body.requested_role,
        "status": "pending",
    }, on_conflict="id").execute()

    sb.table("registration_requests").upsert({
        "user_id": body.user_id,
        "institution_id": institution_id,
        "requested_role": body.requested_role,
        "status": "pending",
        "auth_key_id": matched_key["id"],
    }, on_conflict="user_id").execute()

    return {"status": "pending", "message": "Solicitud enviada. Un administrador revisará tu acceso."}
