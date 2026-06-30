"""Shared dependencies."""
from fastapi import Depends, HTTPException
from core.security import get_current_user


async def get_user_dep(user: dict = Depends(get_current_user)) -> dict:
    return user


async def require_approved(user: dict = Depends(get_current_user)) -> dict:
    if user.get("status") != "approved":
        raise HTTPException(status_code=403, detail="Cuenta pendiente de aprobación")
    return user


async def require_student(user: dict = Depends(require_approved)) -> dict:
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Acceso de estudiante requerido")
    return user


async def require_institutional(user: dict = Depends(require_approved)) -> dict:
    if user.get("role") == "student":
        raise HTTPException(status_code=403, detail="Acceso institucional requerido")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin" or user.get("status") != "approved":
        raise HTTPException(status_code=403, detail="Admin required")
    return user
