"""Psychometric assessment questions and submission (banco fijo, sin IA)."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from agents.question_agent import get_fixed_questions
from agents.twin_agent import generate_twin_profile
from core.supabase_client import get_supabase
from routes.deps import require_student

router = APIRouter(prefix="/psychometric", tags=["psychometric"])

# Banco fijo: c1-c12 psicométrico + c13-c20 vocacional (20 preguntas).
MIN_RESPONSES = 12


class SubmitPsychometric(BaseModel):
    responses: list[dict]


@router.get("/questions")
async def get_questions(user: dict = Depends(require_student)):
    questions = get_fixed_questions()
    return {"questions": questions, "source": "fixed"}


@router.get("/assessment")
async def get_assessment(user: dict = Depends(require_student)):
    sb = get_supabase()
    result = sb.table("psychometric_assessments").select("*").eq("user_id", user["id"]).limit(1).execute()
    return result.data[0] if result.data else None


@router.post("/submit")
async def submit_assessment(body: SubmitPsychometric, user: dict = Depends(require_student)):
    inst = user.get("institution_id")
    if not inst:
        raise HTTPException(status_code=400, detail="Perfil sin institución UTB asignada")
    if len(body.responses) < MIN_RESPONSES:
        raise HTTPException(status_code=400, detail=f"Debe responder al menos {MIN_RESPONSES} preguntas")

    sb = get_supabase()
    now = datetime.now(timezone.utc).isoformat()

    profile = sb.table("student_profiles").select("*").eq("user_id", user["id"]).limit(1).execute()
    profile_data = profile.data[0] if profile.data else None

    questions = get_fixed_questions()
    by_id = {q["id"]: q for q in questions}
    enriched_responses = []
    for resp in body.responses:
        question = by_id.get(resp.get("question_id"))
        if question and not resp.get("text"):
            resp = {**resp, "text": question["text"], "tags": resp.get("tags") or question.get("tags", [])}
            if question.get("reverse"):
                resp = {**resp, "reverse": True}
        enriched_responses.append(resp)

    twin_data = generate_twin_profile(enriched_responses, profile_data)

    assessment: dict = {
        "user_id": user["id"],
        "institution_id": inst,
        "responses": enriched_responses,
        "questions": questions,
        "status": "completed",
        "completed_at": now,
    }
    try:
        sb.table("psychometric_assessments").upsert(assessment, on_conflict="user_id").execute()
    except Exception:
        assessment.pop("questions", None)
        sb.table("psychometric_assessments").upsert(assessment, on_conflict="user_id").execute()

    sb.table("digital_twin_profiles").upsert({
        "user_id": user["id"],
        "interests": twin_data.get("interests", []),
        "learning_style": twin_data.get("learning_style"),
        "emotional_baseline": twin_data.get("emotional_baseline"),
        "summary_text": twin_data.get("summary_text"),
        "traits": twin_data.get("traits", {}),
        "generated_at": now,
    }, on_conflict="user_id").execute()

    try:
        from services.risk_queue import enqueue_risk_recompute
        enqueue_risk_recompute(user["id"], inst, triggered_by="psychometric")
    except Exception:
        pass

    try:
        from services.program_matcher import build_recommendation
        await build_recommendation(user["id"], persist=True)
    except Exception:
        pass

    return {"status": "completed", "twin": twin_data}


@router.get("/twin")
async def get_twin(user: dict = Depends(require_student)):
    sb = get_supabase()
    result = sb.table("digital_twin_profiles").select("*").eq("user_id", user["id"]).limit(1).execute()
    return result.data[0] if result.data else None
