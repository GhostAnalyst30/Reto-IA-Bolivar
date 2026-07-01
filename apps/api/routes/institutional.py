"""Institutional routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from core.supabase_client import get_supabase
from routes.deps import require_institutional, effective_institution_id
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
async def get_kpis(
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    inst = effective_institution_id(user, institution_id)
    dashboard = compute_dashboard({**user, "institution_id": inst})
    return dashboard["kpis"]


@router.get("/actions")
async def get_actions(
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    inst = effective_institution_id(user, institution_id)
    return compute_dashboard({**user, "institution_id": inst})["actions"]


@router.get("/prediction")
async def get_prediction(
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    inst = effective_institution_id(user, institution_id)
    return compute_dashboard({**user, "institution_id": inst})["prediction"]


@router.post("/director/chat")
async def director_chat(
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    sb = get_supabase()
    inst = effective_institution_id(user, institution_id)
    dashboard = compute_dashboard({**user, "institution_id": inst})
    kpis = dashboard["kpis"]
    try:
        insights = await get_director_insights(kpis)
    except Exception:
        insights = "Lo siento, el servidor no funciona"
    return {"insights": insights}
