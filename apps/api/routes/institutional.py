"""Institutional routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from core.supabase_client import get_supabase
from routes.deps import require_institutional, effective_institution_id
from agents.director_agent import get_director_insights
from services.analytics_service import compute_dashboard
from services.risk_service import get_latest_risk_by_institution, persist_risk_reports, compute_student_risk

router = APIRouter(prefix="/institutional", tags=["institutional"])


class InterventionCreate(BaseModel):
    student_id: str
    type: str = "academica"
    notes: str


@router.get("/dashboard")
async def get_dashboard(
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    inst = effective_institution_id(user, institution_id)
    return compute_dashboard({**user, "institution_id": inst})


@router.get("/analytics/dashboard")
async def get_analytics_dashboard(
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    inst = effective_institution_id(user, institution_id)
    return compute_dashboard({**user, "institution_id": inst})


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


@router.get("/risk/students")
async def get_risk_students(
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    inst = effective_institution_id(user, institution_id)
    if not inst:
        return []
    return get_latest_risk_by_institution(inst)


@router.post("/risk/compute")
async def compute_risk(
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    inst = effective_institution_id(user, institution_id)
    if not inst:
        raise HTTPException(status_code=400, detail="Institución requerida")
    count = persist_risk_reports(inst)
    return {"computed": count}


@router.get("/students/{student_id}")
async def get_student_detail(
    student_id: str,
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    sb = get_supabase()
    inst = effective_institution_id(user, institution_id)
    student = sb.table("users").select("id, full_name, email, created_at, institution_id").eq(
        "id", student_id
    ).eq("role", "student").single().execute()
    if not student.data:
        raise HTTPException(status_code=404)

    if inst and student.data.get("institution_id") != inst:
        raise HTTPException(status_code=403)

    profile = sb.table("student_profiles").select("*").eq("user_id", student_id).limit(1).execute()
    risk = sb.table("student_risk_reports").select("*").eq(
        "user_id", student_id
    ).order("computed_at", desc=True).limit(1).execute()
    if not risk.data:
        risk_computed = compute_student_risk(student_id, inst or "")
    else:
        risk_computed = risk.data[0]

    interventions = sb.table("interventions").select("*").eq(
        "student_id", student_id
    ).order("created_at", desc=True).execute()

    chats = sb.table("chats").select("id, title, updated_at").eq(
        "user_id", student_id
    ).order("updated_at", desc=True).limit(10).execute()

    twin = None
    prof = profile.data[0] if profile.data else {}
    if prof.get("twin_consent"):
        twin_result = sb.table("digital_twin_profiles").select(
            "interests, learning_style, summary_text, traits, generated_at"
        ).eq("user_id", student_id).limit(1).execute()
        twin = twin_result.data[0] if twin_result.data else None

    return {
        "student": student.data,
        "profile": prof,
        "risk": risk_computed,
        "interventions": interventions.data or [],
        "activity": chats.data or [],
        "digital_twin": twin,
    }


@router.post("/interventions")
async def create_intervention(
    body: InterventionCreate,
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    sb = get_supabase()
    inst = effective_institution_id(user, institution_id)
    if not inst:
        raise HTTPException(status_code=400, detail="Institución requerida")
    result = sb.table("interventions").insert({
        "student_id": body.student_id,
        "staff_id": user["id"],
        "institution_id": inst,
        "type": body.type,
        "notes": body.notes,
    }).execute()
    return result.data[0]


@router.post("/director/chat")
async def director_chat(
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    inst = effective_institution_id(user, institution_id)
    dashboard = compute_dashboard({**user, "institution_id": inst})
    kpis = dashboard["kpis"]
    try:
        insights = await get_director_insights(kpis)
    except Exception:
        insights = "Lo siento, el servidor no funciona"
    return {"insights": insights}
