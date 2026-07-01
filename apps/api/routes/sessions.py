"""User session tracking."""
import hashlib
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from core.supabase_client import get_supabase
from routes.deps import get_user_dep

router = APIRouter(prefix="/sessions", tags=["sessions"])

MAX_ACTIVE_SESSIONS = 5


class SessionRegister(BaseModel):
    portal: str
    user_agent: str | None = None
    device_label: str | None = None


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


@router.post("/register")
async def register_session(
    body: SessionRegister,
    request: Request,
    user: dict = Depends(get_user_dep),
):
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")

    token = authorization.split(" ", 1)[1]
    sb = get_supabase()
    token_hash = _hash_token(token)

    active = sb.table("user_sessions").select("id").eq(
        "user_id", user["id"]
    ).eq("is_active", True).execute().data or []

    if len(active) >= MAX_ACTIVE_SESSIONS:
        oldest = sb.table("user_sessions").select("id").eq(
            "user_id", user["id"]
        ).eq("is_active", True).order("created_at").limit(1).execute()
        if oldest.data:
            now = datetime.now(timezone.utc).isoformat()
            sb.table("user_sessions").update({
                "is_active": False,
                "revoked_at": now,
            }).eq("id", oldest.data[0]["id"]).execute()

    sb.table("user_sessions").insert({
        "user_id": user["id"],
        "session_token_hash": token_hash,
        "role": user["role"],
        "ip_address": request.client.host if request.client else None,
        "user_agent": body.user_agent,
        "device_label": body.device_label,
        "portal": body.portal,
        "is_active": True,
    }).execute()

    return {"status": "registered"}


@router.post("/heartbeat")
async def session_heartbeat(user: dict = Depends(get_user_dep)):
    sb = get_supabase()
    now = datetime.now(timezone.utc).isoformat()
    sb.table("user_sessions").update({
        "last_activity_at": now,
    }).eq("user_id", user["id"]).eq("is_active", True).execute()
    return {"status": "ok"}


@router.get("/mine")
async def my_sessions(user: dict = Depends(get_user_dep)):
    sb = get_supabase()
    result = sb.table("user_sessions").select("*").eq(
        "user_id", user["id"]
    ).eq("is_active", True).order("last_activity_at", desc=True).execute()
    return result.data or []
