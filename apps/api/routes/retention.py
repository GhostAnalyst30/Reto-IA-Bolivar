"""Retention OS routes: CareQueue, ActionPlan, Sentinel hooks, ML, impact."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from routes.deps import (
    require_institutional,
    effective_institution_id,
)
from services import care_queue as cq
from services import action_plan as ap
from services.dropout_predict import impact_metrics, ml_prediction_summary

router = APIRouter(prefix="/institutional", tags=["retention"])


class CareTicketPatch(BaseModel):
    status: str | None = None
    assigned_to: str | None = None
    summary: str | None = None


class ActionPlanCreate(BaseModel):
    student_id: str
    dominant_cause: str | None = None
    care_ticket_id: str | None = None
    notes: str | None = None


class ActionPlanStepComplete(BaseModel):
    step: int


def _inst(user: dict, institution_id: str | None) -> str:
    inst = effective_institution_id(user, institution_id)
    if not inst:
        raise HTTPException(status_code=400, detail="Institución requerida")
    return inst


@router.get("/care-queue")
async def get_care_queue(
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
    include_resolved: bool = Query(False),
    sync_risk: bool = Query(True),
):
    inst = _inst(user, institution_id)
    synced = 0
    if sync_risk:
        try:
            synced = cq.sync_high_risk_into_queue(inst)
        except Exception:
            synced = 0
    tickets = cq.list_queue(inst, include_resolved=include_resolved)
    return {"tickets": tickets, "synced_from_risk": synced}


@router.patch("/care-queue/{ticket_id}")
async def patch_care_ticket(
    ticket_id: str,
    body: CareTicketPatch,
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    inst = _inst(user, institution_id)
    if body.status and body.status not in ("nuevo", "contactado", "seguimiento", "resuelto"):
        raise HTTPException(status_code=400, detail="Estado inválido")
    try:
        return cq.patch_ticket(
            ticket_id,
            inst,
            {
                "status": body.status,
                "assigned_to": body.assigned_to,
                "summary": body.summary,
            },
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/care-queue/{ticket_id}/brief")
async def care_ticket_brief(
    ticket_id: str,
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    inst = _inst(user, institution_id)
    tickets = cq.list_queue(inst, include_resolved=True, limit=500)
    ticket = next((t for t in tickets if t["id"] == ticket_id), None)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    brief = cq.build_case_brief(ticket["student_id"], inst)
    return {"ticket": ticket, "brief": brief}


@router.post("/action-plans")
async def create_action_plan_endpoint(
    body: ActionPlanCreate,
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    inst = _inst(user, institution_id)
    plan = await ap.create_action_plan(
        student_id=body.student_id,
        institution_id=inst,
        staff_id=user["id"],
        dominant_cause=body.dominant_cause,
        care_ticket_id=body.care_ticket_id,
        notes=body.notes,
    )
    return plan


@router.post("/action-plans/{intervention_id}/steps/complete")
async def complete_action_step(
    intervention_id: str,
    body: ActionPlanStepComplete,
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    inst = _inst(user, institution_id)
    try:
        return ap.complete_plan_step(intervention_id, body.step, inst)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/prediction/ml")
async def prediction_ml(
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    inst = _inst(user, institution_id)
    return ml_prediction_summary(inst)


@router.get("/impact")
async def retention_impact(
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    inst = _inst(user, institution_id)
    return impact_metrics(inst)
