"""ActionPlan — LLM (or template) intervention plans by dominant_cause."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from core.supabase_client import get_supabase
from services.risk_queue import enqueue_risk_recompute

CAUSE_TEMPLATES: dict[str, list[dict]] = {
    "emocional": [
        {"step": 1, "action": "Contactar al estudiante en 24h (chat o correo)", "owner": "counselor"},
        {"step": 2, "action": "Ofrecer sesión de bienestar / escucha activa", "owner": "counselor"},
        {"step": 3, "action": "Revisar mood check-ins a los 7 días", "owner": "counselor"},
        {"step": 4, "action": "Cerrar ticket si riesgo baja a moderado/bajo", "owner": "counselor"},
    ],
    "academico": [
        {"step": 1, "action": "Identificar materias o carga crítica con el estudiante", "owner": "staff"},
        {"step": 2, "action": "Derivar a tutorías / refuerzo académico del programa", "owner": "staff"},
        {"step": 3, "action": "Definir meta de progreso semanal medible", "owner": "student"},
        {"step": 4, "action": "Seguimiento a los 14 días y recomputar riesgo", "owner": "staff"},
    ],
    "economico": [
        {"step": 1, "action": "Explorar situación socioeconómica con sensibilidad", "owner": "counselor"},
        {"step": 2, "action": "Orientar a becas / ayudas institucionales disponibles", "owner": "staff"},
        {"step": 3, "action": "Verificar si completó solicitud de apoyo financiero", "owner": "staff"},
        {"step": 4, "action": "Seguimiento a los 14 días", "owner": "counselor"},
    ],
    "desengagement": [
        {"step": 1, "action": "Reactivar contacto vía Digital Twin u Outreach", "owner": "system"},
        {"step": 2, "action": "Llamada o mensaje personalizado de bienestar", "owner": "counselor"},
        {"step": 3, "action": "Acordar check-in breve semanal por 3 semanas", "owner": "counselor"},
        {"step": 4, "action": "Evaluar reingreso a rutina académica", "owner": "staff"},
    ],
    "motivacional": [
        {"step": 1, "action": "Conversación motivacional breve (metas y barreras)", "owner": "counselor"},
        {"step": 2, "action": "Vincular con mentor o par de apoyo del programa", "owner": "staff"},
        {"step": 3, "action": "Plan de micro-metas académicas semanales", "owner": "student"},
    ],
    "social": [
        {"step": 1, "action": "Explorar red de apoyo y aislamiento percibido", "owner": "counselor"},
        {"step": 2, "action": "Invitar a grupos / actividades de bienestar UTB", "owner": "staff"},
        {"step": 3, "action": "Seguimiento emocional a los 10 días", "owner": "counselor"},
    ],
    "onboarding": [
        {"step": 1, "action": "Recordar completar encuesta psicométrica", "owner": "system"},
        {"step": 2, "action": "Acompañar onboarding del Digital Twin", "owner": "counselor"},
        {"step": 3, "action": "Verificar perfil completo en 7 días", "owner": "staff"},
    ],
}

CAUSE_ALIASES = {
    "emocional": "emocional",
    "academico": "academico",
    "académico": "academico",
    "economico": "economico",
    "económico": "economico",
    "desengagement": "desengagement",
    "desenganche": "desengagement",
    "motivacional": "motivacional",
    "social": "social",
    "onboarding": "onboarding",
}


def _normalize_cause(cause: str | None) -> str:
    if not cause:
        return "desengagement"
    key = cause.strip().lower()
    return CAUSE_ALIASES.get(key, key if key in CAUSE_TEMPLATES else "desengagement")


async def generate_plan_steps(dominant_cause: str | None, student_context: str = "") -> list[dict]:
    """Template-first; optionally enrich with LLM if available."""
    cause = _normalize_cause(dominant_cause)
    steps = [dict(s, done=False) for s in CAUSE_TEMPLATES[cause]]

    try:
        from core.config import settings
        from core.llm_router import complete_with_fallback

        if not settings.openrouter_api_key and not settings.gemini_api_key:
            return steps

        prompt = [
            {
                "role": "system",
                "content": (
                    "Eres un coordinador de retención estudiantil UTB. "
                    "Devuelve SOLO una lista numerada de 3 a 5 pasos accionables en español, "
                    "sin introducción. Cada línea: verbo + acción concreta."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Causa dominante: {cause}\n"
                    f"Contexto: {student_context[:500] or 'sin detalle'}\n"
                    "Genera el plan de intervención."
                ),
            },
        ]
        _, answer, provider = await complete_with_fallback(
            prompt, skip_thinking=True, chat_type=None
        )
        if provider in ("failed", "demo", "counselor") or not answer:
            return steps
        lines = [ln.strip(" -*\t") for ln in answer.splitlines() if ln.strip()]
        parsed = []
        for i, ln in enumerate(lines[:5], start=1):
            # strip leading "1." etc
            cleaned = ln
            for prefix in (f"{i}.", f"{i})", f"{i}-"):
                if cleaned.startswith(prefix):
                    cleaned = cleaned[len(prefix):].strip()
            if cleaned:
                parsed.append({"step": i, "action": cleaned, "owner": "counselor", "done": False})
        return parsed or steps
    except Exception:
        return steps


async def create_action_plan(
    *,
    student_id: str,
    institution_id: str,
    staff_id: str,
    dominant_cause: str | None = None,
    care_ticket_id: str | None = None,
    notes: str | None = None,
) -> dict:
    sb = get_supabase()
    cause = dominant_cause
    if not cause:
        risk = (
            sb.table("student_risk_reports")
            .select("dominant_cause, risk_level, risk_score, factors")
            .eq("user_id", student_id)
            .eq("institution_id", institution_id)
            .order("computed_at", desc=True)
            .limit(1)
            .execute()
        )
        cause = (risk.data or [{}])[0].get("dominant_cause")

    from services.care_queue import build_case_brief
    brief = build_case_brief(student_id, institution_id)
    steps = await generate_plan_steps(cause, brief)
    now = datetime.now(timezone.utc)
    due = now + timedelta(days=14)

    row = {
        "student_id": student_id,
        "staff_id": staff_id,
        "institution_id": institution_id,
        "type": _normalize_cause(cause),
        "title": f"Plan anti-deserción ({_normalize_cause(cause)})",
        "notes": notes or brief,
        "status": "open",
        "dominant_cause": _normalize_cause(cause),
        "plan_steps": steps,
        "due_at": due.isoformat(),
        "care_ticket_id": care_ticket_id,
    }
    result = sb.table("interventions").insert(row).execute()
    return (result.data or [row])[0]


def complete_plan_step(intervention_id: str, step: int, institution_id: str) -> dict:
    sb = get_supabase()
    row = (
        sb.table("interventions")
        .select("*")
        .eq("id", intervention_id)
        .eq("institution_id", institution_id)
        .single()
        .execute()
    )
    if not row.data:
        raise ValueError("Intervención no encontrada")

    steps = row.data.get("plan_steps") or []
    if isinstance(steps, str):
        import json
        steps = json.loads(steps)
    updated = []
    for s in steps:
        item = dict(s)
        if int(item.get("step", -1)) == int(step):
            item["done"] = True
            item["done_at"] = datetime.now(timezone.utc).isoformat()
        updated.append(item)

    all_done = bool(updated) and all(s.get("done") for s in updated)
    payload: dict = {"plan_steps": updated}
    if all_done:
        payload["status"] = "closed"

    sb.table("interventions").update(payload).eq("id", intervention_id).execute()

    # Mark for deferred risk recompute when plan progresses
    enqueue_risk_recompute(row.data["student_id"], institution_id, triggered_by="action_plan_step")

    refreshed = sb.table("interventions").select("*").eq("id", intervention_id).single().execute()
    return refreshed.data or {**row.data, **payload}
