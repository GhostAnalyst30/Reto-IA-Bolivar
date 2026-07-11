"""Helpers for Supabase write operations."""
from fastapi import HTTPException


def require_updated(result, entity: str) -> None:
    """Raise if a Supabase update/insert returned no rows."""
    if getattr(result, "error", None):
        raise HTTPException(status_code=500, detail=f"{entity}: {result.error}")
    data = getattr(result, "data", None)
    if data is not None and len(data) == 0:
        raise HTTPException(status_code=500, detail=f"No se pudo actualizar {entity}")
