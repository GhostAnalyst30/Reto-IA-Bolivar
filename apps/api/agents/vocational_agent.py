"""Academic programs lookup.

La orientación vocacional independiente está fuera de alcance (fusionada en la
encuesta psicométrica, ver NEW_IDEA.md). Este módulo solo expone el listado de
programas académicos activos que consumen otras rutas (p. ej. /programs).
"""
from core.supabase_client import get_supabase


async def get_programs(institution_id: str) -> list[dict]:
    sb = get_supabase()
    result = sb.table("academic_programs").select("id, name, description, program_curricula(id, title, file_url)").eq(
        "institution_id", institution_id
    ).eq("is_active", True).execute()
    return result.data or []
