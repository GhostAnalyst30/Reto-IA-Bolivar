"""Vocational test API + program recommendation."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from agents.vocational_questions import get_root_question_id, get_vocational_questions
from core.supabase_client import get_supabase
from routes.deps import require_student
from services.program_matcher import build_recommendation

router = APIRouter(prefix="/vocational", tags=["vocational"])

# Un camino del árbol suele tener 5 preguntas binarias
MIN_RESPONSES = 4


class SubmitVocational(BaseModel):
    responses: list[dict]


def _public_question(q: dict) -> dict:
    """Hide scoring maps; keep navigation fields for the binary tree UI."""
    return {k: v for k, v in q.items() if k != "domain_map"}


@router.get("/questions")
async def get_questions(user: dict = Depends(require_student)):
    questions = get_vocational_questions()
    return {
        "questions": [_public_question(q) for q in questions],
        "root_id": get_root_question_id(),
        "source": "fixed_binary_tree",
        "mode": "decision_tree",
    }


@router.get("/assessment")
async def get_assessment(user: dict = Depends(require_student)):
    sb = get_supabase()
    result = sb.table("vocational_assessments").select("*").eq("user_id", user["id"]).limit(1).execute()
    return result.data[0] if result.data else None


@router.post("/submit")
async def submit_assessment(body: SubmitVocational, user: dict = Depends(require_student)):
    inst = user.get("institution_id")
    if not inst:
        raise HTTPException(status_code=400, detail="Perfil sin institución UTB asignada")
    if len(body.responses) < MIN_RESPONSES:
        raise HTTPException(status_code=400, detail=f"Debe responder al menos {MIN_RESPONSES} preguntas")

    questions = get_vocational_questions()
    by_id = {q["id"]: q for q in questions}
    enriched = []
    for resp in body.responses:
        q = by_id.get(resp.get("question_id"))
        if q:
            resp = {
                **resp,
                "text": resp.get("text") or q.get("text"),
                "tags": resp.get("tags") or q.get("tags", []),
            }
        enriched.append(resp)

    now = datetime.now(timezone.utc).isoformat()
    sb = get_supabase()
    row = {
        "user_id": user["id"],
        "institution_id": inst,
        "questions": questions,
        "responses": enriched,
        "status": "completed",
        "completed_at": now,
        "updated_at": now,
    }
    sb.table("vocational_assessments").upsert(row, on_conflict="user_id").execute()

    recommendation = await build_recommendation(user["id"], persist=True)
    return {"status": "completed", "recommendation": recommendation}


@router.get("/recommendation")
async def get_recommendation(user: dict = Depends(require_student)):
    return await build_recommendation(user["id"], persist=False)
