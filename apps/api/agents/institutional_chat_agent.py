"""Institutional chat agent — multi-turn Q&A with optional chart specs."""
import json
import re
from core.llm import stream_chat
from core.config import settings


def _build_system_prompt(kpis: list[dict], charts: dict) -> str:
    kpi_text = "\n".join(
        f"- {k['metric_name']}: {k['metric_value']} {k.get('metric_unit', '')}"
        for k in kpis[:12]
    )
    chart_hint = json.dumps(charts, ensure_ascii=False)[:2000]
    return f"""Eres un asistente institucional formal de la UTB (Universidad Tecnológica de Bolívar).
Responde SOLO sobre datos institucionales, acompañamiento estudiantil y prevención de deserción.
Tono: profesional, conciso, educativo. Máximo 150 palabras por respuesta.
Usa Markdown para listas y énfasis cuando ayude.

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
) -> str:
    messages = [{"role": "system", "content": _build_system_prompt(kpis, charts)}]
    for h in history[-8:]:
        role = h.get("role", "user")
        if role in ("user", "assistant"):
            messages.append({"role": role, "content": h.get("content", "")})
    messages.append({"role": "user", "content": message})
    return await stream_chat(messages, model=settings.llm_model_director)
