"""Generación de preguntas psicométricas personalizadas con LLM."""
import json
import logging
import random

from core.llm_router import complete_with_fallback

logger = logging.getLogger(__name__)

TARGET_QUESTIONS = 15

QUESTION_SYSTEM = """Eres un orientador psicopedagógico de la UTB (Universidad Tecnológica de Bolívar).
Genera preguntas para una encuesta de caracterización/test vocacional de un estudiante universitario.

Requisitos:
- Genera EXACTAMENTE {count} preguntas variadas y no repetitivas
- Personalízalas al perfil del estudiante que se te da (programa, semestre, edad)
- Cubre estas dimensiones: motivación, organización del tiempo, bienestar/estrés, apoyo social,
  estilo de aprendizaje, intereses vocacionales, situación socioeconómica y metas académicas
- Mezcla tipos: la mayoría "likert" (escala 1-5 de acuerdo/desacuerdo) y 3-4 de tipo "choice" con 4-5 opciones
- Redacta en español, en segunda persona, tono formal y cercano, con preguntas conversacionales
  (ej.: "¿Cómo te sientes con tu programa actual?", "¿Qué te motiva a seguir estudiando?")
- Responde SOLO con JSON válido (sin markdown) con este formato exacto:
[
  {{"id": "q1", "text": "...", "type": "likert", "tags": ["motivacion"]}},
  {{"id": "q2", "text": "...", "type": "choice", "options": ["...", "..."], "tags": ["intereses"]}}
]
- Tags permitidos: motivacion, organizacion, bienestar, estres, social, visual, auditivo,
  kinestesico, intereses, socioeconomico, metas
- Las preguntas de tipo likert que midan algo negativo (p. ej. estrés) deben incluir "reverse": true"""

# Banco estático de respaldo (usado si el LLM falla); se barajan y se toman 15
FALLBACK_QUESTIONS = [
    {"id": "f1", "text": "Me siento motivado/a para continuar mis estudios universitarios", "type": "likert", "tags": ["motivacion"]},
    {"id": "f2", "text": "Tengo claridad sobre mis metas académicas a corto plazo", "type": "likert", "tags": ["metas"]},
    {"id": "f3", "text": "Me resulta fácil organizar mi tiempo entre clases, estudio y vida personal", "type": "likert", "tags": ["organizacion"]},
    {"id": "f4", "text": "Siento apoyo de mi familia o red cercana en mi proceso universitario", "type": "likert", "tags": ["social"]},
    {"id": "f5", "text": "Experimento niveles de estrés que afectan mi rendimiento académico", "type": "likert", "tags": ["bienestar", "estres"], "reverse": True},
    {"id": "f6", "text": "Participo activamente en actividades extracurriculares o grupos estudiantiles", "type": "likert", "tags": ["social"]},
    {"id": "f7", "text": "Prefiero aprender con material visual (diagramas, videos, infografías)", "type": "likert", "tags": ["visual"]},
    {"id": "f8", "text": "Me siento cómodo/a pidiendo ayuda a docentes o compañeros", "type": "likert", "tags": ["social"]},
    {"id": "f9", "text": "Aprendo mejor escuchando explicaciones o discutiendo los temas en voz alta", "type": "likert", "tags": ["auditivo"]},
    {"id": "f10", "text": "Prefiero aprender haciendo: prácticas, laboratorios o proyectos", "type": "likert", "tags": ["kinestesico"]},
    {"id": "f11", "text": "Duermo lo suficiente y mantengo hábitos saludables durante el semestre", "type": "likert", "tags": ["bienestar"]},
    {"id": "f12", "text": "Considero que mi programa académico se ajusta a mis intereses profesionales", "type": "likert", "tags": ["intereses", "motivacion"]},
    {"id": "f13", "text": "¿Qué área te interesa más para oportunidades futuras?", "type": "choice", "options": ["Tecnología", "Emprendimiento", "Investigación", "Bienestar", "Artes"], "tags": ["intereses"]},
    {"id": "f14", "text": "¿Cómo describirías tu situación económica actual?", "type": "choice", "options": ["Estable", "Regular", "Requiere apoyo", "Prefiero no decir"], "tags": ["socioeconomico"]},
    {"id": "f15", "text": "¿Cuál es tu meta principal al terminar la carrera?", "type": "choice", "options": ["Trabajar en una empresa", "Emprender", "Estudiar un posgrado", "Investigar", "Aún no lo sé"], "tags": ["metas"]},
    {"id": "f16", "text": "¿En qué momento del día estudias con mayor concentración?", "type": "choice", "options": ["Mañana", "Tarde", "Noche", "Madrugada"], "tags": ["organizacion"]},
    {"id": "f17", "text": "Me adapto con facilidad a los cambios en mi rutina académica", "type": "likert", "tags": ["bienestar"]},
    {"id": "f18", "text": "Suelo posponer tareas importantes hasta el último momento", "type": "likert", "tags": ["organizacion"], "reverse": True},
]

VALID_TYPES = {"likert", "choice"}


def get_fallback_questions() -> list[dict]:
    """Banco estático barajado — usado cuando el LLM falla o no devuelve preguntas válidas."""
    bank = random.sample(FALLBACK_QUESTIONS, min(TARGET_QUESTIONS, len(FALLBACK_QUESTIONS)))
    random.shuffle(bank)
    return [{**q, "id": f"q{i + 1}"} for i, q in enumerate(bank)]


def _fallback_bank() -> list[dict]:
    return get_fallback_questions()


def _sanitize(raw_questions: list) -> list[dict]:
    cleaned: list[dict] = []
    for i, q in enumerate(raw_questions):
        if not isinstance(q, dict):
            continue
        text = str(q.get("text") or "").strip()
        qtype = str(q.get("type") or "likert").strip().lower()
        if not text or qtype not in VALID_TYPES:
            continue
        item: dict = {
            "id": f"q{len(cleaned) + 1}",
            "text": text,
            "type": qtype,
            "tags": [str(t) for t in (q.get("tags") or [])][:4],
        }
        if qtype == "choice":
            options = [str(o).strip() for o in (q.get("options") or []) if str(o).strip()]
            if len(options) < 2:
                continue
            item["options"] = options[:6]
        if q.get("reverse"):
            item["reverse"] = True
        cleaned.append(item)
    return cleaned


async def generate_personalized_questions(profile: dict | None, age: int | None = None) -> list[dict]:
    """Genera ~15 preguntas personalizadas y aleatorias; fallback a banco estático."""
    profile = profile or {}
    context_parts = []
    if profile.get("program"):
        context_parts.append(f"programa: {profile['program']}")
    if profile.get("semester"):
        context_parts.append(f"semestre: {profile['semester']}")
    if age:
        context_parts.append(f"edad: {age} años")
    context = ", ".join(context_parts) or "sin datos académicos aún (primer ingreso)"

    seed = random.randint(1000, 9999)
    prompt = (
        f"Perfil inicial del estudiante: {context}.\n"
        f"Semilla de variación: {seed} (usa esta semilla para que las preguntas sean distintas en cada generación).\n"
        f"Genera las {TARGET_QUESTIONS} preguntas ahora."
    )
    messages = [
        {"role": "system", "content": QUESTION_SYSTEM.format(count=TARGET_QUESTIONS)},
        {"role": "user", "content": prompt},
    ]
    try:
        _, raw, provider = await complete_with_fallback(messages, skip_thinking=True)
        if provider in ("failed", "demo"):
            return _fallback_bank()
        text = raw.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        start = text.find("[")
        end = text.rfind("]")
        if start == -1 or end == -1:
            return _fallback_bank()
        questions = _sanitize(json.loads(text[start:end + 1]))
        if len(questions) < 10:
            return _fallback_bank()
        return questions[:TARGET_QUESTIONS]
    except Exception as exc:
        logger.warning("Question generation failed, using fallback bank: %s", exc)
        return _fallback_bank()
