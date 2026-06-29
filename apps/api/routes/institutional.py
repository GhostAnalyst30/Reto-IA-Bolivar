"""Institutional routes."""
from fastapi import APIRouter, Depends
from core.supabase_client import get_supabase
from routes.deps import get_user_dep
from agents.director_agent import get_director_insights

router = APIRouter(prefix="/institutional", tags=["institutional"])


@router.get("/kpis")
async def get_kpis(user: dict = Depends(get_user_dep)):
    sb = get_supabase()
    inst_id = user.get("institution_id")
    query = sb.table("institutional_kpis").select("*")
    if inst_id:
        query = query.eq("institution_id", inst_id)
    result = query.execute()
    return result.data or []


@router.post("/director/chat")
async def director_chat(user: dict = Depends(get_user_dep)):
    sb = get_supabase()
    kpis = sb.table("institutional_kpis").select("*").execute()
    insights = await get_director_insights(kpis.data or [])
    return {"insights": insights}
