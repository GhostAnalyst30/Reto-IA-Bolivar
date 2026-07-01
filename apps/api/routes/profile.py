"""Profile routes — update info and change password."""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from core.supabase_client import get_supabase
from core.security_monitor import log_security_event
from routes.deps import get_user_dep

router = APIRouter(prefix="/profile", tags=["profile"])


class ProfileUpdate(BaseModel):
    full_name: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.get("")
async def get_profile(user: dict = Depends(get_user_dep)):
    sb = get_supabase()
    inst = None
    if user.get("institution_id"):
        inst = sb.table("institutions").select("id, name, slug").eq(
            "id", user["institution_id"]
        ).single().execute().data
    return {**user, "institution": inst}


@router.patch("")
async def update_profile(body: ProfileUpdate, user: dict = Depends(get_user_dep)):
    if not body.full_name.strip():
        raise HTTPException(status_code=400, detail="Nombre requerido")

    sb = get_supabase()
    sb.table("users").update({
        "full_name": body.full_name.strip(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", user["id"]).execute()

    return {"full_name": body.full_name.strip(), "notify": "profile_changed"}


@router.post("/change-password")
async def change_password(
    body: PasswordChange,
    user: dict = Depends(get_user_dep),
    authorization: str | None = Header(None),
):
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 8 caracteres")

    sb = get_supabase()
    try:
        sb.auth.sign_in_with_password({"email": user["email"], "password": body.current_password})
    except Exception:
        log_security_event("failed_login", severity="medium", user_id=user["id"], details={"action": "password_change"})
        raise HTTPException(status_code=403, detail="Contraseña actual incorrecta")

    sb.auth.admin.update_user_by_id(user["id"], {"password": body.new_password})
    log_security_event("password_changed", severity="low", user_id=user["id"])

    return {"status": "ok", "notify": "password_changed"}
