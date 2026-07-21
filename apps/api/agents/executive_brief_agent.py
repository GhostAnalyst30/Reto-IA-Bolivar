"""Executive brief agent — situational KPI messages via LangChain with template fallback."""
from __future__ import annotations

import json
import logging
import re
from typing import Any

from core.config import settings
from core.llm_router import complete_with_fallback

logger = logging.getLogger(__name__)


def _kpi_map(kpis: list[dict]) -> dict[str, float]:
    out: dict[str, float] = {}
    for k in kpis or []:
        name = (k.get("metric_name") or "").strip()
        try:
            out[name] = float(k.get("metric_value") or 0)
        except (TypeError, ValueError):
            continue
    return out


def template_messages(kpis: list[dict], charts: dict | None = None, extra: dict | None = None) -> list[dict[str, str]]:
    """Deterministic situational messages (fallback / always available)."""
    m = _kpi_map(kpis)
    extra = extra or {}
    messages: list[dict[str, str]] = []

    high_risk = m.get("students_high_risk") or m.get("high_risk_students") or m.get("riesgo_alto") or 0
    active_7d = m.get("active_students_7d") or m.get("active_7d") or 0
    enrolled = m.get("enrolled_students") or m.get("total_students") or m.get("matriculados") or 0
    chats = m.get("chats_7d") or m.get("chat_sessions") or 0
    psycho = m.get("psychometric_completed") or m.get("psychometric_done") or 0
    care = extra.get("care_queue_open") or m.get("care_queue_open") or 0
    pending = extra.get("pending_requests") or m.get("pending_requests") or 0

    if high_risk >= 5:
        messages.append({
            "tone": "alert",
            "title": "Riesgo de deserción elevado",
            "body": f"Hay {int(high_risk)} estudiantes en riesgo alto. Priorice CareQueue y seguimiento de bienestar.",
        })
    elif high_risk > 0:
        messages.append({
            "tone": "watch",
            "title": "Estudiantes en observación",
            "body": f"{int(high_risk)} estudiante(s) en riesgo alto. Revise acciones de retención esta semana.",
        })
    else:
        messages.append({
            "tone": "ok",
            "title": "Riesgo controlado",
            "body": "No hay concentración crítica de riesgo alto en los indicadores actuales.",
        })

    if enrolled and active_7d / max(enrolled, 1) < 0.35:
        messages.append({
            "tone": "watch",
            "title": "Engagement bajo",
            "body": f"Solo {int(active_7d)} de {int(enrolled)} estudiantes activos en 7 días. Impulse campañas de acompañamiento.",
        })
    else:
        messages.append({
            "tone": "ok",
            "title": "Actividad reciente",
            "body": f"{int(active_7d)} estudiantes activos en los últimos 7 días"
            + (f" ({int(chats)} chats)." if chats else "."),
        })

    if care:
        messages.append({
            "tone": "alert",
            "title": "Cola de cuidado",
            "body": f"{int(care)} ticket(s) abiertos en CareQueue requieren revisión humana.",
        })
    if pending:
        messages.append({
            "tone": "watch",
            "title": "Solicitudes pendientes",
            "body": f"{int(pending)} solicitud(es) de registro esperan vinculación.",
        })
    if enrolled and psycho / max(enrolled, 1) < 0.4:
        messages.append({
            "tone": "watch",
            "title": "Psicométricos incompletos",
            "body": f"Solo {int(psycho)} perfiles psicométricos completos. Motive la encuesta Digital Twin.",
        })

    engagement = (charts or {}).get("engagement") or []
    if engagement:
        top = max(engagement, key=lambda x: x.get("value") or 0)
        messages.append({
            "tone": "info",
            "title": "Canal con más engagement",
            "body": f"«{top.get('label', 'N/A')}» lidera con {top.get('value', 0)} interacciones registradas.",
        })

    # Cap 3–5
    return messages[:5]


async def generate_executive_messages(
    kpis: list[dict],
    charts: dict | None = None,
    *,
    extra: dict | None = None,
    user_id: str | None = None,
) -> tuple[list[dict[str, str]], str, bool]:
    """
    Returns (messages, provider, degraded).
    Prefers LangChain LLM JSON list; falls back to templates.
    """
    templates = template_messages(kpis, charts, extra)
    kpi_text = "\n".join(
        f"- {k.get('metric_name')}: {k.get('metric_value')} {k.get('metric_unit') or ''}"
        for k in (kpis or [])[:16]
    )
    prompt = f"""Eres un analista institucional UTB. Con estos KPIs genera EXACTAMENTE un JSON array de 3 a 5 objetos
con campos: tone (alert|watch|ok|info), title (máx 6 palabras), body (máx 28 palabras, español formal).
Sin markdown ni texto fuera del JSON. Usa SOLO estos números:
{kpi_text}
Extra: {json.dumps(extra or {}, ensure_ascii=False)}
"""
    try:
        _, answer, provider = await complete_with_fallback(
            [
                {"role": "system", "content": "Respondes solo JSON válido. Sin comentarios."},
                {"role": "user", "content": prompt},
            ],
            model=settings.llm_model_director,
            skip_thinking=True,
            chat_type=None,
            user_id=user_id,
            metadata={"agent": "executive_brief", "chat_type": "executive"},
        )
        parsed = _parse_messages_json(answer)
        if parsed:
            return parsed[:5], provider, False
    except Exception as exc:
        logger.warning("Executive brief LLM failed: %s", exc)

    return templates, "template", True


def _parse_messages_json(text: str) -> list[dict[str, str]]:
    raw = (text or "").strip()
    if not raw:
        return []
    # Extract JSON array if wrapped
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if match:
        raw = match.group(0)
    try:
        data: Any = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []
    out: list[dict[str, str]] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        body = str(item.get("body") or "").strip()
        tone = str(item.get("tone") or "info").strip().lower()
        if tone not in ("alert", "watch", "ok", "info"):
            tone = "info"
        if title and body:
            out.append({"tone": tone, "title": title, "body": body})
    return out
