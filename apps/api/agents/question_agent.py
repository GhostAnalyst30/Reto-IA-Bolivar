"""Banco fijo de preguntas de caracterización (sin IA)."""
from __future__ import annotations

# IDs estables c1…c15 — no barajar: la encuesta debe ser determinista.
FIXED_CHARACTERIZATION_QUESTIONS: list[dict] = [
    {
        "id": "c1",
        "text": "Me siento motivado/a para continuar mis estudios universitarios",
        "type": "likert",
        "tags": ["motivacion"],
    },
    {
        "id": "c2",
        "text": "Tengo claridad sobre mis metas académicas a corto plazo",
        "type": "likert",
        "tags": ["metas"],
    },
    {
        "id": "c3",
        "text": "Me resulta fácil organizar mi tiempo entre clases, estudio y vida personal",
        "type": "likert",
        "tags": ["organizacion"],
    },
    {
        "id": "c4",
        "text": "Siento apoyo de mi familia o red cercana en mi proceso universitario",
        "type": "likert",
        "tags": ["social"],
    },
    {
        "id": "c5",
        "text": "Experimento niveles de estrés que afectan mi rendimiento académico",
        "type": "likert",
        "tags": ["bienestar", "estres"],
        "reverse": True,
    },
    {
        "id": "c6",
        "text": "Participo activamente en actividades extracurriculares o grupos estudiantiles",
        "type": "likert",
        "tags": ["social"],
    },
    {
        "id": "c7",
        "text": "Prefiero aprender con material visual (diagramas, videos, infografías)",
        "type": "likert",
        "tags": ["visual"],
    },
    {
        "id": "c8",
        "text": "Me siento cómodo/a pidiendo ayuda a docentes o compañeros",
        "type": "likert",
        "tags": ["social"],
    },
    {
        "id": "c9",
        "text": "Aprendo mejor escuchando explicaciones o discutiendo los temas en voz alta",
        "type": "likert",
        "tags": ["auditivo"],
    },
    {
        "id": "c10",
        "text": "Prefiero aprender haciendo: prácticas, laboratorios o proyectos",
        "type": "likert",
        "tags": ["kinestesico"],
    },
    {
        "id": "c11",
        "text": "Duermo lo suficiente y mantengo hábitos saludables durante el semestre",
        "type": "likert",
        "tags": ["bienestar"],
    },
    {
        "id": "c12",
        "text": "Considero que mi programa académico se ajusta a mis intereses profesionales",
        "type": "likert",
        "tags": ["intereses", "motivacion"],
    },
    {
        "id": "c13",
        "text": "¿Qué área te interesa más para oportunidades futuras?",
        "type": "choice",
        "options": ["Tecnología", "Emprendimiento", "Investigación", "Bienestar", "Artes"],
        "tags": ["intereses"],
    },
    {
        "id": "c14",
        "text": "¿Cómo describirías tu situación económica actual?",
        "type": "choice",
        "options": ["Estable", "Regular", "Requiere apoyo", "Prefiero no decir"],
        "tags": ["socioeconomico"],
    },
    {
        "id": "c15",
        "text": "¿Cuál es tu meta principal al terminar la carrera?",
        "type": "choice",
        "options": ["Trabajar en una empresa", "Emprender", "Estudiar un posgrado", "Investigar", "Aún no lo sé"],
        "tags": ["metas"],
    },
]


def get_fixed_questions() -> list[dict]:
    """Banco fijo ordenado para la encuesta de caracterización (sin LLM)."""
    return [dict(q) for q in FIXED_CHARACTERIZATION_QUESTIONS]
