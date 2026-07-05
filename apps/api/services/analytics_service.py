"""Real-time institutional analytics from live user data."""
from datetime import datetime, timedelta, timezone

from core.cache import TTLCache
from core.parallel import run_parallel
from core.supabase_client import get_supabase
from services.risk_service import get_latest_risk_by_institution

_dashboard_cache = TTLCache(ttl_seconds=60.0)


def _institution_id(user: dict) -> str | None:
    return user.get("institution_id")


def _compute_dashboard_impl(inst: str) -> dict:
    sb = get_supabase()

    students = sb.table("users").select("id, created_at", count="exact").eq(
        "institution_id", inst
    ).eq("role", "student").eq("status", "approved").execute()

    enrollment = students.count or len(students.data or [])
    student_ids = [s["id"] for s in (students.data or [])]

    chats_count = 0
    messages_count = 0
    vocational_count = 0
    saved_count = 0
    active_7d = 0
    avg_progress = 0.0

    if student_ids:
        week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

        def fetch_chats():
            return sb.table("chats").select("id, user_id, updated_at").in_("user_id", student_ids).execute()

        def fetch_psych():
            try:
                return sb.table("psychometric_assessments").select("id", count="exact").eq(
                    "institution_id", inst
                ).eq("status", "completed").execute()
            except Exception:
                return None

        def fetch_saved():
            return sb.table("saved_resources").select("id", count="exact").in_("user_id", student_ids).execute()

        def fetch_progress():
            return sb.table("student_progress").select("progress_percent").in_("user_id", student_ids).execute()

        chats, psych, saved, progress_result = run_parallel(
            fetch_chats, fetch_psych, fetch_saved, fetch_progress
        )

        chats_count = len(chats.data or [])
        active_users = {c["user_id"] for c in (chats.data or []) if c.get("updated_at", "") >= week_ago}
        active_7d = len(active_users)

        chat_ids = [c["id"] for c in (chats.data or [])]
        if chat_ids:
            msgs = sb.table("messages").select("id", count="exact").in_("chat_id", chat_ids).execute()
            messages_count = msgs.count or 0

        if psych:
            vocational_count = psych.count or 0
        saved_count = saved.count or 0

        if progress_result and progress_result.data:
            avg_progress = sum(p.get("progress_percent", 0) for p in progress_result.data) / len(progress_result.data)

    retention = min(99.9, round(70 + (avg_progress * 0.25) + (active_7d / max(enrollment, 1) * 15), 1))
    at_risk = max(0, enrollment - active_7d)

    avg_risk_score = 0.0
    try:
        risk_rows = get_latest_risk_by_institution(inst)
        if risk_rows:
            avg_risk_score = sum(r.get("risk_score", 0) for r in risk_rows) / len(risk_rows)
            at_risk = sum(1 for r in risk_rows if r.get("risk_level") in ("alto", "moderado"))
    except Exception:
        pass

    kpis = [
        {"metric_name": "enrollment", "metric_value": enrollment, "metric_unit": "students", "period": "live"},
        {"metric_name": "active_users_7d", "metric_value": active_7d, "metric_unit": "users", "period": "7d"},
        {"metric_name": "avg_risk_score", "metric_value": round(avg_risk_score, 1), "metric_unit": "riesgo promedio /100", "period": "live"},
        {"metric_name": "retention_rate", "metric_value": retention, "metric_unit": "percent", "period": "live"},
        {"metric_name": "chat_sessions", "metric_value": chats_count, "metric_unit": "chats", "period": "live"},
        {"metric_name": "messages_total", "metric_value": messages_count, "metric_unit": "messages", "period": "live"},
        {"metric_name": "psychometric_completed", "metric_value": vocational_count, "metric_unit": "encuestas", "period": "live"},
        {"metric_name": "resources_saved", "metric_value": saved_count, "metric_unit": "bookmarks", "period": "live"},
        {"metric_name": "avg_progress", "metric_value": round(avg_progress, 1), "metric_unit": "percent", "period": "live"},
        {"metric_name": "at_risk_students", "metric_value": at_risk, "metric_unit": "students", "period": "14d"},
    ]

    charts = {
        "enrollment_trend": [
            {"label": "Matriculados", "value": enrollment},
            {"label": "Activos 7d", "value": active_7d},
            {"label": "En riesgo", "value": at_risk},
        ],
        "engagement": [
            {"label": "Chats", "value": chats_count},
            {"label": "Mensajes", "value": messages_count},
            {"label": "Encuestas", "value": vocational_count},
        ],
    }

    actions = []
    if at_risk > 0:
        actions.append({
            "title": f"Tutoría IA para {at_risk} estudiantes inactivos",
            "priority": "high",
            "status": "pending",
        })
    if vocational_count < enrollment * 0.3 and enrollment > 0:
        actions.append({
            "title": "Promover encuesta psicométrica en primer semestre",
            "priority": "medium",
            "status": "pending",
        })
    if avg_progress < 50 and enrollment > 0:
        actions.append({
            "title": "Revisar rutas de aprendizaje con bajo avance",
            "priority": "high",
            "status": "in_progress",
        })
    if not actions:
        actions.append({
            "title": "Mantener monitoreo de KPIs semanal",
            "priority": "low",
            "status": "in_progress",
        })

    prediction = {
        "retention_forecast": retention,
        "dropout_risk_percent": round(100 - retention, 1),
        "confidence": "medium" if enrollment >= 5 else "low",
        "factors": [
            f"{active_7d}/{enrollment} estudiantes activos en 7 días",
            f"Progreso promedio {round(avg_progress, 1)}%",
        ],
    }

    return {
        "kpis": kpis,
        "charts": charts,
        "actions": actions,
        "prediction": prediction,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def compute_dashboard(user: dict) -> dict:
    inst = _institution_id(user)
    if not inst:
        return {
            "kpis": [],
            "charts": {
                "enrollment_trend": [],
                "engagement": [],
            },
            "actions": [],
            "prediction": {},
        }

    cached = _dashboard_cache.get(inst)
    if cached is not None:
        return cached

    result = _compute_dashboard_impl(inst)
    _dashboard_cache.set(inst, result)
    return result
