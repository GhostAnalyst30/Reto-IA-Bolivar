"""Institutional routes."""
from fastapi import APIRouter, Depends, HTTPException
from core.supabase_client import get_supabase
from routes.deps import require_institutional
from agents.director_agent import get_director_insights

router = APIRouter(prefix="/institutional", tags=["institutional"])


def _kpi_query(sb, user: dict):
    query = sb.table("institutional_kpis").select("*")
    inst_id = user.get("institution_id")
    if inst_id:
        query = query.eq("institution_id", inst_id)
    return query


@router.get("/kpis")
async def get_kpis(user: dict = Depends(require_institutional)):
    sb = get_supabase()
    result = _kpi_query(sb, user).execute()
    return result.data or []


@router.post("/director/chat")
async def director_chat(user: dict = Depends(require_institutional)):
    sb = get_supabase()
    kpis = _kpi_query(sb, user).execute()
    try:
        insights = await get_director_insights(kpis.data or [])
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Error del modelo IA: {exc}") from exc
    return {"insights": insights}
