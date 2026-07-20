"""Outreach segment builder — emails are sent by the Next.js Brevo cron."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from core.supabase_client import get_supabase

UTB_INSTITUTION_ID = "a0000000-0000-4000-8000-000000000001"
OUTREACH_COOLDOWN_DAYS = 7

SEGMENT_COPY = {
    "inactive_7d": {
        "subject": "UTB Te acompaña — ¿cómo estás esta semana?",
        "body_intro": (
            "Hace varios días que no vemos actividad en tu Digital Twin. "
            "Estamos para acompañarte; entra cuando quieras conversar."
        ),
        "cta_path": "/student/twin/chat",
    },
    "high_risk": {
        "subject": "UTB Te acompaña — queremos apoyarte",
        "body_intro": (
            "Detectamos señales de riesgo académico/emocional y queremos "
            "ofrecerte acompañamiento personalizado con bienestar universitario."
        ),
        "cta_path": "/student/twin/chat",
    },
    "survey_incomplete": {
        "subject": "Completa tu encuesta — Digital Twin UTB",
        "body_intro": (
            "Tu encuesta psicométrica aún no está completa. "
            "Toma pocos minutos y habilita tu acompañamiento personalizado."
        ),
        "cta_path": "/student/onboarding/survey",
    },
}


def _recently_contacted(sb, user_id: str, segment: str) -> bool:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=OUTREACH_COOLDOWN_DAYS)).isoformat()
    rows = (
        sb.table("outreach_logs")
        .select("id")
        .eq("user_id", user_id)
        .eq("segment", segment)
        .gte("created_at", cutoff)
        .limit(1)
        .execute()
    )
    return bool(rows.data)


def build_outreach_targets(institution_id: str = UTB_INSTITUTION_ID, limit_per_segment: int = 40) -> dict:
    """Return email targets grouped by segment for the web cron to send via Brevo."""
    from services.risk_service import get_latest_risk_by_institution

    sb = get_supabase()
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()

    students = (
        sb.table("users")
        .select("id, email, full_name")
        .eq("institution_id", institution_id)
        .eq("role", "student")
        .eq("status", "approved")
        .execute()
    )
    smap = {s["id"]: s for s in (students.data or [])}
    if not smap:
        return {"segments": {}, "copy": SEGMENT_COPY}

    # Inactive: no twin chat update in 7d
    chats = (
        sb.table("chats")
        .select("user_id, updated_at")
        .eq("chat_type", "digital_twin")
        .in_("user_id", list(smap.keys()))
        .execute()
    )
    last_active = {}
    for c in chats.data or []:
        uid = c["user_id"]
        ts = c.get("updated_at") or ""
        if uid not in last_active or ts > last_active[uid]:
            last_active[uid] = ts

    inactive = []
    for uid, student in smap.items():
        ts = last_active.get(uid)
        if not ts or ts < week_ago:
            if not _recently_contacted(sb, uid, "inactive_7d"):
                inactive.append({
                    "user_id": uid,
                    "email": student["email"],
                    "full_name": student.get("full_name") or "Estudiante",
                    "segment": "inactive_7d",
                    "dominant_cause": "desengagement",
                })
            if len(inactive) >= limit_per_segment:
                break

    # High risk without open intervention
    high_risk = []
    risks = get_latest_risk_by_institution(institution_id, risk_level="alto") or []
    open_iv = (
        sb.table("interventions")
        .select("student_id")
        .eq("institution_id", institution_id)
        .eq("status", "open")
        .execute()
    )
    open_set = {r["student_id"] for r in (open_iv.data or [])}
    for r in risks:
        uid = r["user_id"]
        if uid not in smap or uid in open_set:
            continue
        if _recently_contacted(sb, uid, "high_risk"):
            continue
        st = smap[uid]
        high_risk.append({
            "user_id": uid,
            "email": st["email"],
            "full_name": st.get("full_name") or "Estudiante",
            "segment": "high_risk",
            "dominant_cause": r.get("dominant_cause") or "emocional",
            "risk_score": r.get("risk_score"),
        })
        if len(high_risk) >= limit_per_segment:
            break

    # Survey incomplete
    psych = (
        sb.table("psychometric_assessments")
        .select("user_id, status")
        .in_("user_id", list(smap.keys()))
        .execute()
    )
    completed = {p["user_id"] for p in (psych.data or []) if p.get("status") == "completed"}
    survey = []
    for uid, student in smap.items():
        if uid in completed:
            continue
        if _recently_contacted(sb, uid, "survey_incomplete"):
            continue
        survey.append({
            "user_id": uid,
            "email": student["email"],
            "full_name": student.get("full_name") or "Estudiante",
            "segment": "survey_incomplete",
            "dominant_cause": "onboarding",
        })
        if len(survey) >= limit_per_segment:
            break

    return {
        "institution_id": institution_id,
        "segments": {
            "inactive_7d": inactive,
            "high_risk": high_risk,
            "survey_incomplete": survey,
        },
        "copy": SEGMENT_COPY,
        "counts": {
            "inactive_7d": len(inactive),
            "high_risk": len(high_risk),
            "survey_incomplete": len(survey),
        },
    }


def log_outreach(
    *,
    institution_id: str,
    user_id: str,
    segment: str,
    subject: str,
    status: str,
    brevo_id: str | None = None,
) -> None:
    sb = get_supabase()
    sb.table("outreach_logs").insert({
        "institution_id": institution_id,
        "user_id": user_id,
        "segment": segment,
        "subject": subject,
        "status": status,
        "brevo_id": brevo_id,
    }).execute()
