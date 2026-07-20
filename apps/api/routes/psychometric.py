"""Psychometric assessment questions and submission."""
from datetime import date, datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from core.cache import registry
from core.supabase_client import get_supabase
from routes.deps import require_student
from agents.twin_agent import generate_twin_profile
from agents.question_agent import generate_personalized_questions, get_fallback_questions

router = APIRouter(prefix="/psychometric", tags=["psychometric"])

MIN_RESPONSES = 10

# Preguntas generadas por usuario (para asociarlas a las respuestas en el submit)
questions_cache = registry.cache("psychometric_questions", ttl_seconds=3600.0, max_size=1024)


class SubmitPsychometric(BaseModel):
    responses: list[dict]


def _age_from_birth_date(birth_date_str: str | None) -> int | None:
    if not birth_date_str:
        return None
    try:
        born = date.fromisoformat(str(birth_date_str)[:10])
    except ValueError:
        return None
    today = date.today()
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))


@router.get("/questions")
async def get_questions(user: dict = Depends(require_student)):
    questions: list[dict] = []
    try:
        sb = get_supabase()
        profile_res = sb.table("student_profiles").select("program, semester, birth_date").eq(
            "user_id", user["id"]
        ).limit(1).execute()
        profile = profile_res.data[0] if profile_res.data else {}
        age = _age_from_birth_date(profile.get("birth_date"))
        questions = await generate_personalized_questions(profile, age)
    except Exception:
        questions = []
    if not questions:
        questions = get_fallback_questions()
        source = "fallback"
    else:
        source = "generated"
    questions_cache.set(user["id"], questions)
    return {"questions": questions, "source": source}


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

    # Asociar el texto de la pregunta generada a cada respuesta para el perfil twin
    questions = questions_cache.get(user["id"]) or get_fallback_questions()
    by_id = {q["id"]: q for q in questions}
    enriched_responses = []
    for resp in body.responses:
        question = by_id.get(resp.get("question_id"))
        if question and not resp.get("text"):
            resp = {**resp, "text": question["text"], "tags": resp.get("tags") or question.get("tags", [])}
        enriched_responses.append(resp)

    twin_data = await generate_twin_profile(enriched_responses, profile_data)

    assessment: dict = {
        "user_id": user["id"],
        "institution_id": inst,
        "responses": enriched_responses,
        "status": "completed",
        "completed_at": now,
    }
    if questions:
        assessment["questions"] = questions
    try:
        sb.table("psychometric_assessments").upsert(assessment, on_conflict="user_id").execute()
    except Exception:
        # Compatibilidad con BD sin la columna questions (migración 010 pendiente)
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

    questions_cache.invalidate(user["id"])

    try:
        from services.risk_queue import enqueue_risk_recompute
        enqueue_risk_recompute(user["id"], inst, triggered_by="psychometric")
    except Exception:
        pass

    return {"status": "completed", "twin": twin_data}


@router.get("/twin")
async def get_twin(user: dict = Depends(require_student)):
    sb = get_supabase()
    result = sb.table("digital_twin_profiles").select("*").eq("user_id", user["id"]).limit(1).execute()
    return result.data[0] if result.data else None
