"""Autenticación: disponibilidad de username y resolución para login."""
from fastapi import APIRouter, HTTPException, Query
from core.supabase_client import get_supabase
from core.username import is_valid_username, normalize_username, suggest_usernames

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/username/check")
async def check_username(username: str = Query(..., min_length=3, max_length=30)):
    normalized = normalize_username(username)
    if not is_valid_username(normalized):
        raise HTTPException(
            status_code=400,
            detail="El usuario debe tener 3-30 caracteres, empezar con letra y usar solo minúsculas, números o _",
        )

    sb = get_supabase()
    existing = sb.table("users").select("username").eq("username", normalized).limit(1).execute()
    if existing.data:
        taken_rows = sb.table("users").select("username").ilike("username", f"{normalized[:20]}%").limit(20).execute()
        taken = {r["username"] for r in (taken_rows.data or []) if r.get("username")}
        return {
            "available": False,
            "username": normalized,
            "suggestions": suggest_usernames(normalized, taken),
        }

    return {"available": True, "username": normalized, "suggestions": []}


@router.get("/username/lookup")
async def lookup_username(username: str = Query(..., min_length=3, max_length=30)):
    normalized = normalize_username(username)
    if not is_valid_username(normalized):
        raise HTTPException(status_code=400, detail="Usuario inválido")

    sb = get_supabase()
    result = sb.table("users").select("email, status").eq("username", normalized).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    row = result.data[0]
    return {"email": row["email"], "status": row.get("status")}
