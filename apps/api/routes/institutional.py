"""Institutional routes."""
from fastapi import APIRouter, Depends, HTTPException
from core.supabase_client import get_supabase
from routes.deps import require_institutional
from agents.director_agent import get_director_insights
from services.analytics_service import compute_dashboard

router = APIRouter(prefix="/institutional", tags=["institutional"])


def _kpi_query(sb, user: dict):
    query = sb.table("institutional_kpis").select("*")
    inst_id = user.get("institution_id")
    if inst_id:
        query = query.eq("institution_id", inst_id)
    return query


@router.get("/kpis")
async def get_kpis(user: dict = Depends(require_institutional)):
    dashboard = compute_dashboard(user)
    return dashboard["kpis"]


@router.get("/analytics/dashboard")
async def analytics_dashboard(user: dict = Depends(require_institutional)):
    return compute_dashboard(user)


@router.get("/actions")
async def get_actions(user: dict = Depends(require_institutional)):
    return compute_dashboard(user)["actions"]


@router.get("/prediction")
async def get_prediction(user: dict = Depends(require_institutional)):
    return compute_dashboard(user)["prediction"]


@router.post("/director/chat")
async def director_chat(user: dict = Depends(require_institutional)):
    sb = get_supabase()
    dashboard = compute_dashboard(user)
    kpis = dashboard["kpis"]
    try:
        insights = await get_director_insights(kpis)
    except Exception:
        insights = "Lo siento, el servidor no funciona"
    return {"insights": insights}
