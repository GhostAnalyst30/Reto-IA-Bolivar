"""Sentinel — early-warning proactive twin messages + CareQueue escalation."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from core.supabase_client import get_supabase
from services.care_queue import upsert_ticket
from services.chat_handoff import escalate_chat_to_human, get_counselor_user

# Don't re-nudge the same student within this window
SENTINEL_COOLDOWN_HOURS = 72
UTB_INSTITUTION_ID = "a0000000-0000-4000-8000-000000000001"

PROACTIVE_TEMPLATES = {
    "mood": (
        "Hola. Noté que reportaste ánimo bajo varias veces esta semana. "
        "¿Quieres contarme cómo te sientes, o prefieres hablar con bienestar universitario?"
    ),
    "inactivity": (
        "Hola. Hace varios días que no hablamos. Solo quería saber cómo estás "
        "y si hay algo en lo que el Digital Twin o bienestar puedan acompañarte."
    ),
    "worsening": (
        "Hola. Detecté que tu señal de riesgo aumentó respecto a la semana pasada. "
        "¿Quieres revisar juntos qué está pasando, o te conecto con una persona de bienestar?"
    ),
    "critico": (
        "Hola. Prioricé tu acompañamiento porque hay señales de alto riesgo. "
        "Estoy disponible aquí, y también puedes pedir apoyo humano cuando lo necesites."
    ),
}


def _parse_ts(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return None


def classify_trajectory(
    *,
    current_score: float,
    previous_score: float | None,
    low_mood_count_7d: int,
    inactive_days: float | None,
    pending_support: bool,
) -> tuple[str, str]:
    """Returns (trajectory, reason_key)."""
    if pending_support or current_score >= 75 or low_mood_count_7d >= 4:
        return "critico", "critico"
    if previous_score is not None and current_score - previous_score >= 15:
        return "empeorando", "worsening"
    if low_mood_count_7d >= 3:
        return "empeorando", "mood"
    if inactive_days is not None and inactive_days >= 5:
        return "empeorando", "inactivity"
    if current_score >= 60:
        return "empeorando", "worsening"
    return "estable", "ok"


def _ensure_twin_chat(sb, user_id: str) -> str:
    existing = (
        sb.table("chats")
        .select("id")
        .eq("user_id", user_id)
        .eq("chat_type", "digital_twin")
        .order("updated_at", desc=True)
        .limit(1)
        .execute()
    )
    if existing.data:
        return existing.data[0]["id"]
    created = sb.table("chats").insert({
        "user_id": user_id,
        "title": "Digital Twin",
        "chat_type": "digital_twin",
    }).execute()
    return created.data[0]["id"]


def _recent_sentinel(sb, user_id: str) -> bool:
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=SENTINEL_COOLDOWN_HOURS)).isoformat()
    rows = (
        sb.table("sentinel_events")
        .select("id")
        .eq("user_id", user_id)
        .gte("created_at", cutoff)
        .limit(1)
        .execute()
    )
    return bool(rows.data)


def run_sentinel(institution_id: str = UTB_INSTITUTION_ID, limit: int = 80) -> dict:
    """Scan latest risk reports and act on empeorando/critico students."""
    from services.risk_service import get_latest_risk_by_institution

    sb = get_supabase()
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()

    latest = get_latest_risk_by_institution(institution_id) or []
    # Focus on moderado+alto
    candidates = [r for r in latest if (r.get("risk_score") or 0) >= 30][:limit]

    nudged = 0
    tickets = 0
    escalated = 0
    skipped = 0

    for row in candidates:
        user_id = row["user_id"]
        if _recent_sentinel(sb, user_id):
            skipped += 1
            continue

        # Previous score (second-latest)
        hist = (
            sb.table("student_risk_reports")
            .select("risk_score, computed_at")
            .eq("user_id", user_id)
            .eq("institution_id", institution_id)
            .order("computed_at", desc=True)
            .limit(2)
            .execute()
        )
        prev_score = None
        if hist.data and len(hist.data) > 1:
            prev_score = float(hist.data[1].get("risk_score") or 0)

        moods = (
            sb.table("mood_checkins")
            .select("mood_score, created_at")
            .eq("user_id", user_id)
            .gte("created_at", week_ago)
            .execute()
        )
        low_mood = sum(1 for m in (moods.data or []) if (m.get("mood_score") or 5) <= 2)

        chat_rows = (
            sb.table("chats")
            .select("id, updated_at, handoff_mode")
            .eq("user_id", user_id)
            .eq("chat_type", "digital_twin")
            .order("updated_at", desc=True)
            .limit(1)
            .execute()
        )
        inactive_days = None
        handoff_mode = "ai"
        if chat_rows.data:
            handoff_mode = chat_rows.data[0].get("handoff_mode") or "ai"
            ts = _parse_ts(chat_rows.data[0].get("updated_at"))
            if ts:
                inactive_days = (now - ts).total_seconds() / 86400
        else:
            inactive_days = 999

        support = (
            sb.table("support_requests")
            .select("id")
            .eq("user_id", user_id)
            .in_("status", ["pending", "assigned"])
            .limit(1)
            .execute()
        )
        pending_support = bool(support.data)

        trajectory, reason_key = classify_trajectory(
            current_score=float(row.get("risk_score") or 0),
            previous_score=prev_score,
            low_mood_count_7d=low_mood,
            inactive_days=inactive_days,
            pending_support=pending_support,
        )
        if trajectory == "estable":
            skipped += 1
            continue

        chat_id = _ensure_twin_chat(sb, user_id)
        message = PROACTIVE_TEMPLATES.get(reason_key, PROACTIVE_TEMPLATES["worsening"])

        # Only post proactive message if not already in human/resolved handoff
        if handoff_mode == "ai":
            sb.table("messages").insert({
                "chat_id": chat_id,
                "role": "assistant",
                "content": message,
            }).execute()
            sb.table("chats").update({"updated_at": now.isoformat()}).eq("id", chat_id).execute()
            nudged += 1

        counselor = get_counselor_user(sb)
        ticket = upsert_ticket(
            institution_id=institution_id,
            student_id=user_id,
            source="sentinel",
            dominant_cause=row.get("dominant_cause"),
            risk_level=row.get("risk_level"),
            risk_score=row.get("risk_score"),
            summary=f"Sentinel ({trajectory}): {reason_key}. {row.get('dominant_cause') or ''}",
            chat_id=chat_id,
            assigned_to=counselor.get("id"),
        )
        tickets += 1

        care_ticket_id = ticket.get("id")
        if trajectory == "critico" and handoff_mode == "ai":
            try:
                escalate_chat_to_human(
                    sb, chat_id, user_id,
                    reason=f"Sentinel automático: trayectoria crítica ({reason_key})",
                    escalation_reason="sentinel",
                )
                escalated += 1
            except Exception:
                pass

        sb.table("sentinel_events").insert({
            "user_id": user_id,
            "institution_id": institution_id,
            "trajectory": trajectory,
            "reason": reason_key,
            "chat_id": chat_id,
            "care_ticket_id": care_ticket_id,
        }).execute()

    return {
        "scanned": len(candidates),
        "nudged": nudged,
        "tickets": tickets,
        "escalated": escalated,
        "skipped": skipped,
    }
