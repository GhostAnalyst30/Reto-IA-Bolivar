"""Institutional chat agent — multi-turn Q&A with optional chart specs."""
import json
import re
from core.llm_router import complete_with_fallback, HANDOFF_MESSAGE
from core.config import settings


def _build_system_prompt(kpis: list[dict], charts: dict, *, privileged: bool = False, role: str = "admin") -> str:
    kpi_text = "\n".join(
        f"- {k['metric_name']}: {k['metric_value']} {k.get('metric_unit', '')}"
        for k in kpis[:12]
    )
    chart_hint = json.dumps(charts, ensure_ascii=False)[:2000]
    if privileged:
        privacy = f"""Privacidad y datos (rol privilegiado: {role}):
- Puedes responder sobre datos del sistema, KPIs, riesgo y métricas institucionales
- Si el alcance lo permite, puedes orientar sobre estudiantes o listados agregados usando solo datos provistos
- No inventes datos que no estén en el contexto; indica cuando falte información
- Mantén tono profesional UTB"""
    else:
        privacy = """Privacidad y datos personales:
- NUNCA reveles nombres, correos, cédulas, teléfonos, notas ni perfiles Digital Twin de estudiantes identificables
- Usa únicamente los KPIs agregados provistos; si piden datos individuales, indica que están protegidos por política UTB
- No inventes listados de estudiantes ni exportaciones de datos personales"""

    return f"""Eres un asistente institucional formal de la UTB (Universidad Tecnológica de Bolívar).
Responde sobre datos institucionales, acompañamiento estudiantil y prevención de deserción.
Tono: profesional, conciso, educativo. Máximo 180 palabras por respuesta.
Usa Markdown para listas y énfasis cuando ayude.

{privacy}

KPIs actuales (usa SOLO estos números, no inventes):
{kpi_text}

Datos para gráficas disponibles:
{chart_hint}

Si la pregunta requiere visualización, incluye al final del mensaje un bloque JSON en una línea:
CHART::{{"type":"pie"|"bar","title":"...","data":[{{"label":"...","value":N}}]}}
Solo incluye CHART:: cuando sea realmente útil. Si no aplica, no lo incluyas."""


def parse_chart_from_response(text: str) -> tuple[str, dict | None]:
    match = re.search(r"CHART::(\{.*\})\s*$", text, re.DOTALL)
    if not match:
        return text.strip(), None
    clean = text[: match.start()].strip()
    try:
        chart = json.loads(match.group(1))
        return clean, chart
    except json.JSONDecodeError:
        return text.strip(), None


async def institutional_chat_reply(
    message: str,
    history: list[dict],
    kpis: list[dict],
    charts: dict,
    *,
    privileged: bool = False,
    role: str = "admin",
    user_id: str | None = None,
    escalate_on_failure: bool = False,
) -> tuple[str, str]:
    """Returns (answer_text, provider)."""
    messages = [{"role": "system", "content": _build_system_prompt(kpis, charts, privileged=privileged, role=role)}]
    for h in history[-8:]:
        role_h = h.get("role", "user")
        if role_h in ("user", "assistant"):
            messages.append({"role": role_h, "content": h.get("content", "")})
    messages.append({"role": "user", "content": message})
    _reasoning, answer, provider = await complete_with_fallback(
        messages,
        model=settings.llm_model_director,
        skip_thinking=True,
        chat_type="privileged" if privileged else "institutional",
        user_id=user_id,
        escalate_on_failure=escalate_on_failure,
        fallback=(lambda: HANDOFF_MESSAGE) if escalate_on_failure else None,
        metadata={"agent": "institutional_chat", "role": role, "privileged": privileged},
    )
    return answer, provider
