"""JWT verification."""
from fastapi import Header, HTTPException
from jose import jwt, JWTError
from core.cache import user_profile_cache
from core.config import settings
from core.supabase_client import get_supabase

_PROFILE_FIELDS = "id, email, full_name, role, status, institution_id, created_at"


def _fetch_user_profile(user_id: str) -> dict:
    sb = get_supabase()
    profile = sb.table("users").select(_PROFILE_FIELDS).eq("id", user_id).limit(1).execute()
    rows = profile.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Profile not found")
    return rows[0]


def invalidate_user_cache(user_id: str) -> None:
    user_profile_cache.invalidate(user_id)


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
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    cached = user_profile_cache.get(user_id)
    if cached is not None:
        return cached

    try:
        row = _fetch_user_profile(user_id)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=503, detail="Auth backend unavailable")

    user_profile_cache.set(user_id, row)
    return row

