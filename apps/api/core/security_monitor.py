"""Security event logging."""
from core.supabase_client import get_supabase


def log_security_event(
    event_type: str,
    severity: str = "medium",
    user_id: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    details: dict | None = None,
):
    try:
        sb = get_supabase()
        sb.table("security_events").insert({
            "event_type": event_type,
            "severity": severity,
            "user_id": user_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "details": details or {},
        }).execute()
    except Exception:
        pass
