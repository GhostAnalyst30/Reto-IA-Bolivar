"""Psychometric assessment questions and submission."""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from core.supabase_client import get_supabase
from routes.deps import require_student
from agents.twin_agent import generate_twin_profile

router = APIRouter(prefix="/psychometric", tags=["psychometric"])

QUESTIONS = [
    {"id": "q1", "text": "Me siento motivado/a para continuar mis estudios universitarios", "type": "likert", "tags": ["motivacion"]},
    {"id": "q2", "text": "Tengo claridad sobre mis metas académicas a corto plazo", "type": "likert", "tags": ["motivacion"]},
    {"id": "q3", "text": "Me resulta fácil organizar mi tiempo entre clases, estudio y vida personal", "type": "likert", "tags": ["organizacion"]},
    {"id": "q4", "text": "Siento apoyo de mi familia o red cercana en mi proceso universitario", "type": "likert", "tags": ["social"]},
    {"id": "q5", "text": "Experimento niveles de estrés que afectan mi rendimiento académico", "type": "likert", "tags": ["bienestar", "estres"], "reverse": True},
    {"id": "q6", "text": "Participo activamente en actividades extracurriculares o grupos estudiantiles", "type": "likert", "tags": ["social"]},
    {"id": "q7", "text": "Prefiero aprender con material visual (diagramas, videos, infografías)", "type": "likert", "tags": ["visual"]},
    {"id": "q8", "text": "Me siento cómodo/a pidiendo ayuda a docentes o compañeros", "type": "likert", "tags": ["social"]},
    {"id": "q9", "text": "¿Qué área te interesa más para oportunidades futuras?", "type": "choice", "options": ["Tecnología", "Emprendimiento", "Investigación", "Bienestar", "Artes"], "tags": ["intereses"]},
    {"id": "q10", "text": "¿Cómo describirías tu situación económica actual?", "type": "choice", "options": ["Estable", "Regular", "Requiere apoyo", "Prefiero no decir"], "tags": ["socioeconomico"]},
]


class SubmitPsychometric(BaseModel):
    responses: list[dict]


@router.get("/questions")
async def get_questions(user: dict = Depends(require_student)):
    return {"questions": QUESTIONS}


@router.get("/assessment")
async def get_assessment(user: dict = Depends(require_student)):
    sb = get_supabase()
    result = sb.table("psychometric_assessments").select("*").eq("user_id", user["id"]).limit(1).execute()
    return result.data[0] if result.data else None


@router.post("/submit")
async def submit_assessment(body: SubmitPsychometric, user: dict = Depends(require_student)):
    inst = user.get("institution_id")
    if not inst:
        raise HTTPException(status_code=400, detail="Vincule una institución primero")
    if len(body.responses) < 10:
        raise HTTPException(status_code=400, detail="Debe responder las 10 preguntas")

    sb = get_supabase()
    now = datetime.now(timezone.utc).isoformat()

    profile = sb.table("student_profiles").select("*").eq("user_id", user["id"]).limit(1).execute()
    profile_data = profile.data[0] if profile.data else None

    twin_data = await generate_twin_profile(body.responses, profile_data)

    sb.table("psychometric_assessments").upsert({
        "user_id": user["id"],
        "institution_id": inst,
        "responses": body.responses,
        "status": "completed",
        "completed_at": now,
    }, on_conflict="user_id").execute()

    sb.table("digital_twin_profiles").upsert({
        "user_id": user["id"],
        "interests": twin_data.get("interests", []),
        "learning_style": twin_data.get("learning_style"),
        "emotional_baseline": twin_data.get("emotional_baseline"),
        "summary_text": twin_data.get("summary_text"),
        "traits": twin_data.get("traits", {}),
        "generated_at": now,
    }, on_conflict="user_id").execute()

    return {"status": "completed", "twin": twin_data}


@router.get("/twin")
async def get_twin(user: dict = Depends(require_student)):
    sb = get_supabase()
    result = sb.table("digital_twin_profiles").select("*").eq("user_id", user["id"]).limit(1).execute()
    return result.data[0] if result.data else None
