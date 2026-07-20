"""CareQueue — unified intervention tickets for counselors."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from core.supabase_client import get_supabase

SLA_HOURS = {"critica": 4, "alta": 24, "media": 48, "baja": 72}


def _urgency_from_score(risk_score: float | None, source: str) -> str:
    if source in ("handoff", "sentinel") and (risk_score or 0) >= 60:
        return "critica"
    score = float(risk_score or 0)
    if score >= 75 or source == "handoff":
        return "alta"
    if score >= 60:
        return "media"
    return "baja"


def _priority(risk_score: float | None, urgency: str, source: str) -> float:
    base = float(risk_score or 0)
    boost = {"critica": 40, "alta": 25, "media": 10, "baja": 0}.get(urgency, 0)
    source_boost = {"handoff": 15, "sentinel": 10, "support": 8, "risk": 0}.get(source, 0)
    return round(base + boost + source_boost, 1)


def upsert_ticket(
    *,
    institution_id: str,
    student_id: str,
    source: str,
    dominant_cause: str | None = None,
    risk_level: str | None = None,
    risk_score: float | None = None,
    summary: str | None = None,
    chat_id: str | None = None,
    support_request_id: str | None = None,
    assigned_to: str | None = None,
) -> dict:
    sb = get_supabase()
    urgency = _urgency_from_score(risk_score, source)
    priority = _priority(risk_score, urgency, source)
    now = datetime.now(timezone.utc)
    sla_due = now + timedelta(hours=SLA_HOURS.get(urgency, 48))

    existing = (
        sb.table("care_queue_tickets")
        .select("id, status")
        .eq("student_id", student_id)
        .eq("institution_id", institution_id)
        .neq("status", "resuelto")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    payload = {
        "institution_id": institution_id,
        "student_id": student_id,
        "source": source,
        "priority_score": priority,
        "urgency": urgency,
        "dominant_cause": dominant_cause,
        "risk_level": risk_level,
        "risk_score": risk_score,
        "summary": summary,
        "chat_id": chat_id,
        "support_request_id": support_request_id,
        "assigned_to": assigned_to,
        "sla_due_at": sla_due.isoformat(),
        "updated_at": now.isoformat(),
    }
    if existing.data:
        tid = existing.data[0]["id"]
        # Don't downgrade status; refresh priority/summary
        sb.table("care_queue_tickets").update(payload).eq("id", tid).execute()
        row = sb.table("care_queue_tickets").select("*").eq("id", tid).single().execute()
        return row.data or {"id": tid, **payload}

    payload["status"] = "nuevo"
    payload["created_at"] = now.isoformat()
    result = sb.table("care_queue_tickets").insert(payload).execute()
    return (result.data or [payload])[0]


def list_queue(institution_id: str, *, include_resolved: bool = False, limit: int = 100) -> list[dict]:
    sb = get_supabase()
    q = (
        sb.table("care_queue_tickets")
        .select("*")
        .eq("institution_id", institution_id)
        .order("priority_score", desc=True)
        .limit(limit)
    )
    if not include_resolved:
        q = q.neq("status", "resuelto")
    tickets = q.execute().data or []
    if not tickets:
        return []

    student_ids = list({t["student_id"] for t in tickets})
    students = (
        sb.table("users")
        .select("id, full_name, email")
        .in_("id", student_ids)
        .execute()
    )
    smap = {s["id"]: s for s in (students.data or [])}

    now = datetime.now(timezone.utc)
    out = []
    for t in tickets:
        st = smap.get(t["student_id"], {})
        sla = t.get("sla_due_at")
        overdue = False
        if sla and t.get("status") != "resuelto":
            try:
                due = datetime.fromisoformat(str(sla).replace("Z", "+00:00"))
                overdue = due < now
            except Exception:
                pass
        out.append({
            **t,
            "student_name": st.get("full_name") or st.get("email"),
            "student_email": st.get("email"),
            "sla_overdue": overdue,
        })
    return out


def patch_ticket(ticket_id: str, institution_id: str, updates: dict) -> dict:
    sb = get_supabase()
    row = (
        sb.table("care_queue_tickets")
        .select("*")
        .eq("id", ticket_id)
        .eq("institution_id", institution_id)
        .single()
        .execute()
    )
    if not row.data:
        raise ValueError("Ticket no encontrado")

    now = datetime.now(timezone.utc).isoformat()
    payload = {k: v for k, v in updates.items() if v is not None}
    payload["updated_at"] = now
    if payload.get("status") == "contactado" and not row.data.get("contacted_at"):
        payload["contacted_at"] = now
    if payload.get("status") == "resuelto":
        payload["resolved_at"] = now

    sb.table("care_queue_tickets").update(payload).eq("id", ticket_id).execute()
    refreshed = sb.table("care_queue_tickets").select("*").eq("id", ticket_id).single().execute()
    return refreshed.data or {**row.data, **payload}


def sync_high_risk_into_queue(institution_id: str) -> int:
    """Pull latest alto-risk students into CareQueue."""
    from services.risk_service import get_latest_risk_by_institution

    rows = get_latest_risk_by_institution(institution_id, risk_level="alto")
    created = 0
    for r in rows or []:
        upsert_ticket(
            institution_id=institution_id,
            student_id=r["user_id"],
            source="risk",
            dominant_cause=r.get("dominant_cause"),
            risk_level=r.get("risk_level"),
            risk_score=r.get("risk_score"),
            summary=_case_summary(r),
        )
        created += 1
    return created


def _case_summary(risk_row: dict) -> str:
    factors = risk_row.get("factors") or []
    labels = []
    for f in factors[:4]:
        if isinstance(f, dict):
            labels.append(f.get("label") or f.get("key") or "")
    cause = risk_row.get("dominant_cause") or "sin causa"
    score = risk_row.get("risk_score")
    bits = [f"Riesgo {risk_row.get('risk_level')} ({score})", f"Causa: {cause}"]
    if labels:
        bits.append("Factores: " + "; ".join(x for x in labels if x))
    return " · ".join(bits)


def build_case_brief(student_id: str, institution_id: str) -> str:
    """Short counselor brief without LLM (deterministic, fast)."""
    sb = get_supabase()
    risk = (
        sb.table("student_risk_reports")
        .select("risk_level, risk_score, dominant_cause, factors, computed_at")
        .eq("user_id", student_id)
        .eq("institution_id", institution_id)
        .order("computed_at", desc=True)
        .limit(1)
        .execute()
    )
    moods = (
        sb.table("mood_checkins")
        .select("mood_score, created_at")
        .eq("user_id", student_id)
        .order("created_at", desc=True)
        .limit(3)
        .execute()
    )
    chat = (
        sb.table("chats")
        .select("id, handoff_mode, updated_at")
        .eq("user_id", student_id)
        .eq("chat_type", "digital_twin")
        .order("updated_at", desc=True)
        .limit(1)
        .execute()
    )
    lines = []
    if risk.data:
        r = risk.data[0]
        lines.append(
            f"Riesgo {r.get('risk_level')} ({r.get('risk_score')}), causa {r.get('dominant_cause') or 'n/d'}."
        )
        for f in (r.get("factors") or [])[:3]:
            if isinstance(f, dict) and f.get("label"):
                lines.append(f"- {f['label']}")
    if moods.data:
        avg = sum(m["mood_score"] for m in moods.data) / len(moods.data)
        lines.append(f"Ánimo reciente (últimos {len(moods.data)}): promedio {avg:.1f}/5.")
    if chat.data:
        c = chat.data[0]
        lines.append(f"Twin: handoff={c.get('handoff_mode')}, última actividad {c.get('updated_at')}.")
    return "\n".join(lines) if lines else "Sin datos suficientes para el resumen."
