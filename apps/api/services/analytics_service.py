"""Real-time institutional analytics from live user data."""
from datetime import datetime, timezone

from core.cache import dashboard_cache
from core.supabase_client import get_supabase


def _institution_id(user: dict) -> str | None:
    return user.get("institution_id")


def _compute_dashboard_impl(inst: str) -> dict:
    sb = get_supabase()

    stats: dict = {}
    try:
        rpc = sb.rpc("institution_dashboard_stats", {"p_institution_id": inst}).execute()
        stats = rpc.data or {}
    except Exception:
        stats = {}

    enrollment = int(stats.get("enrollment") or 0)
    active_7d = int(stats.get("active_7d") or 0)
    chats_count = int(stats.get("chats_count") or 0)
    messages_count = int(stats.get("messages_count") or 0)
    vocational_count = int(stats.get("psychometric_count") or 0)
    saved_count = int(stats.get("saved_count") or 0)
    avg_progress = float(stats.get("avg_progress") or 0.0)
    avg_risk_score = float(stats.get("avg_risk_score") or 0.0)
    at_risk = int(stats.get("at_risk_count") or 0)
    inactive_7d = max(0, enrollment - active_7d)

    retention = min(99.9, round(70 + (avg_progress * 0.25) + (active_7d / max(enrollment, 1) * 15), 1))

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
        {"metric_name": "at_risk_students", "metric_value": at_risk, "metric_unit": "students", "period": "live"},
        {"metric_name": "inactive_twin_7d", "metric_value": inactive_7d, "metric_unit": "students", "period": "7d"},
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
            "title": f"Revisar {at_risk} estudiantes con riesgo alto o moderado",
            "priority": "high",
            "status": "pending",
        })
    if inactive_7d > 0:
        actions.append({
            "title": f"Contactar {inactive_7d} estudiantes sin actividad en Digital Twin (7 días)",
            "priority": "high" if inactive_7d >= 3 else "medium",
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
            f"{active_7d}/{enrollment} estudiantes activos en Digital Twin (7 días)",
            f"Progreso promedio {round(avg_progress, 1)}%",
            f"{at_risk} estudiantes con riesgo alto o moderado",
        ],
    }

    from services.risk_service import get_cohort_risk_alerts
    cohort_alerts = get_cohort_risk_alerts(inst)

    return {
        "kpis": kpis,
        "charts": charts,
        "actions": actions,
        "prediction": prediction,
        "cohort_alerts": cohort_alerts,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def invalidate_dashboard(institution_id: str) -> None:
    dashboard_cache.invalidate(institution_id)


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
            "cohort_alerts": [],
        }

    cached = dashboard_cache.get(inst)
    if cached is not None:
        return cached

    result = _compute_dashboard_impl(inst)
    dashboard_cache.set(inst, result)
    return result
