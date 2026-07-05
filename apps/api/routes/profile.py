"""Profile routes — update info and change password."""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from core.supabase_client import get_supabase
from core.security_monitor import log_security_event
from routes.deps import get_user_dep

router = APIRouter(prefix="/profile", tags=["profile"])


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    student_id: str | None = None
    program: str | None = None
    semester: int | None = None
    contact_preference: str | None = None
    twin_consent: bool | None = None


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
    student_profile = None
    if user.get("role") == "student":
        sp = sb.table("student_profiles").select("*").eq("user_id", user["id"]).limit(1).execute()
        student_profile = sp.data[0] if sp.data else None
    return {**user, "institution": inst, "student_profile": student_profile}


@router.get("/student")
async def get_student_profile(user: dict = Depends(get_user_dep)):
    sb = get_supabase()
    result = sb.table("student_profiles").select("*").eq("user_id", user["id"]).limit(1).execute()
    return result.data[0] if result.data else {}


@router.patch("")
async def update_profile(body: ProfileUpdate, user: dict = Depends(get_user_dep)):
    sb = get_supabase()
    updates: dict = {}

    if body.full_name is not None:
        if not body.full_name.strip():
            raise HTTPException(status_code=400, detail="Nombre requerido")
        updates["full_name"] = body.full_name.strip()

    if updates:
        sb.table("users").update({
            **updates,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", user["id"]).execute()

    if user.get("role") == "student" and any(
        v is not None for v in [body.student_id, body.program, body.semester, body.contact_preference, body.twin_consent]
    ):
        sp: dict = {"user_id": user["id"], "updated_at": datetime.now(timezone.utc).isoformat()}
        if body.student_id is not None:
            sp["student_id"] = body.student_id
        if body.program is not None:
            sp["program"] = body.program
        if body.semester is not None:
            sp["semester"] = body.semester
        if body.contact_preference is not None:
            sp["contact_preference"] = body.contact_preference
        if body.twin_consent is not None:
            sp["twin_consent"] = body.twin_consent
        sb.table("student_profiles").upsert(sp, on_conflict="user_id").execute()

    return {"full_name": updates.get("full_name", user.get("full_name")), "notify": "profile_changed" if updates else None}


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
