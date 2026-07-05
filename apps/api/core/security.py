"""JWT verification."""
from fastapi import Header, HTTPException
from jose import jwt, JWTError
from core.config import settings
from core.supabase_client import get_supabase


async def get_current_user(authorization: str | None = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        if settings.supabase_jwt_secret:
            payload = jwt.decode(token, settings.supabase_jwt_secret, algorithms=["HS256"], audience="authenticated")
        else:
            sb = get_supabase()
            user_resp = sb.auth.get_user(token)
            if not user_resp or not user_resp.user:
                raise HTTPException(status_code=401, detail="Invalid token")
            payload = {"sub": user_resp.user.id}
    except JWTError:
        try:
            sb = get_supabase()
            user_resp = sb.auth.get_user(token)
            if not user_resp or not user_resp.user:
                raise HTTPException(status_code=401, detail="Invalid token")
            payload = {"sub": user_resp.user.id}
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    sb = get_supabase()
    profile = sb.table("users").select(
        "id, email, full_name, role, status, institution_id, username, created_at"
    ).eq("id", user_id).single().execute()
    if not profile.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile.data

