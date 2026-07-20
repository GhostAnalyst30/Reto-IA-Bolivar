"""Shared dependencies."""
from fastapi import Depends, HTTPException, Query
from core.security import get_current_user
from core.config import settings

PLATFORM_ADMIN = "platform_admin"
INSTITUTIONAL_ROLES = frozenset({"area_head", "dean", "vice_president", "rector", "admin", PLATFORM_ADMIN})
UTB_INSTITUTION_ID = "a0000000-0000-4000-8000-000000000001"


def is_platform_admin(user: dict) -> bool:
    return user.get("role") == PLATFORM_ADMIN and user.get("status") == "approved"


def is_institution_admin(user: dict) -> bool:
    return user.get("role") == "admin" and user.get("status") == "approved"


def effective_institution_id(user: dict, institution_id: str | None = None) -> str | None:
    """Resuelve institución activa: UTB por defecto para platform_admin, perfil para el resto."""
    if is_platform_admin(user):
        return institution_id or UTB_INSTITUTION_ID
    return user.get("institution_id")


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
    if user.get("role") not in INSTITUTIONAL_ROLES:
        raise HTTPException(status_code=403, detail="Acceso institucional requerido")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("status") != "approved":
        raise HTTPException(status_code=403, detail="Cuenta no aprobada")
    if not is_institution_admin(user) and not is_platform_admin(user):
        raise HTTPException(status_code=403, detail="Admin required")
    return user


async def require_platform_admin(user: dict = Depends(get_current_user)) -> dict:
    if not is_platform_admin(user):
        raise HTTPException(status_code=403, detail="Platform admin required")
    return user


async def require_counselor(user: dict = Depends(require_approved)) -> dict:
    if (user.get("email") or "").lower() != settings.psychologist_email.lower():
        raise HTTPException(status_code=403, detail="Acceso de psicólogo requerido")
    return user
