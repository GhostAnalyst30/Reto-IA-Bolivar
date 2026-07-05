"""Student risk scoring and persistence."""
from datetime import datetime, timedelta, timezone
from core.supabase_client import get_supabase


def compute_student_risk(user_id: str, institution_id: str) -> dict:
    sb = get_supabase()
    factors: list[dict] = []
    score = 0.0

    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

    chats = sb.table("chats").select("updated_at").eq("user_id", user_id).eq(
        "chat_type", "digital_twin"
    ).execute()
    recent = any(c.get("updated_at", "") >= week_ago for c in (chats.data or []))
    if not recent:
        score += 35
        factors.append({"key": "inactivity", "label": "Sin actividad en Digital Twin (7 días)", "weight": 35})

    psych = sb.table("psychometric_assessments").select("status").eq("user_id", user_id).limit(1).execute()
    if not psych.data or psych.data[0].get("status") != "completed":
        score += 25
        factors.append({"key": "survey", "label": "Encuesta psicométrica incompleta", "weight": 25})

    progress = sb.table("student_progress").select("progress_percent").eq("user_id", user_id).execute()
    if progress.data:
        avg = sum(p.get("progress_percent", 0) for p in progress.data) / len(progress.data)
        if avg < 40:
            score += 20
            factors.append({"key": "progress", "label": f"Bajo progreso académico ({avg:.0f}%)", "weight": 20})
    else:
        score += 10
        factors.append({"key": "progress", "label": "Sin datos de progreso", "weight": 10})

    moods = sb.table("mood_checkins").select("mood_score").eq("user_id", user_id).order(
        "created_at", desc=True
    ).limit(3).execute()
    if moods.data:
        avg_mood = sum(m["mood_score"] for m in moods.data) / len(moods.data)
        if avg_mood <= 2:
            score += 20
            factors.append({"key": "mood", "label": "Estado de ánimo bajo reportado", "weight": 20})

    if score >= 60:
        level = "alto"
    elif score >= 30:
        level = "moderado"
    else:
        level = "bajo"

    return {
        "user_id": user_id,
        "institution_id": institution_id,
        "risk_level": level,
        "risk_score": round(score, 1),
        "factors": factors,
    }


def persist_risk_reports(institution_id: str) -> int:
    sb = get_supabase()
    students = sb.table("users").select("id").eq(
        "institution_id", institution_id
    ).eq("role", "student").eq("status", "approved").execute()

    count = 0
    now = datetime.now(timezone.utc).isoformat()
    for s in students.data or []:
        report = compute_student_risk(s["id"], institution_id)
        sb.table("student_risk_reports").insert({
            **report,
            "computed_at": now,
        }).execute()
        count += 1
    return count


def get_latest_risk_by_institution(institution_id: str) -> list[dict]:
    sb = get_supabase()
    students = sb.table("users").select("id, full_name, email").eq(
        "institution_id", institution_id
    ).eq("role", "student").eq("status", "approved").execute()

    results = []
    for s in students.data or []:
        risk = sb.table("student_risk_reports").select("*").eq(
            "user_id", s["id"]
        ).order("computed_at", desc=True).limit(1).execute()
        profile = sb.table("student_profiles").select("program, semester").eq(
            "user_id", s["id"]
        ).limit(1).execute()
        row = {
            "user_id": s["id"],
            "full_name": s.get("full_name") or s.get("email"),
            "program": profile.data[0].get("program") if profile.data else None,
            "semester": profile.data[0].get("semester") if profile.data else None,
        }
        if risk.data:
            row.update(risk.data[0])
        else:
            computed = compute_student_risk(s["id"], institution_id)
            row.update(computed)
        results.append(row)

    results.sort(key=lambda x: x.get("risk_score", 0), reverse=True)
    return results
