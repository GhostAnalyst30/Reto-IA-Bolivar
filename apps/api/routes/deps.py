"""Shared dependencies."""
from fastapi import Depends
from core.security import get_current_user


async def get_user_dep(user: dict = Depends(get_current_user)) -> dict:
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin" or user.get("status") != "approved":
        raise __import__("fastapi").HTTPException(status_code=403, detail="Admin required")
    return user
