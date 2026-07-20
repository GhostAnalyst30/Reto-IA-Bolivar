"""Deferred risk recompute queue — avoids persist_single_risk_report on every action."""
from __future__ import annotations

from datetime import datetime, timezone

from core.supabase_client import get_supabase


def enqueue_risk_recompute(user_id: str, institution_id: str, triggered_by: str = "action") -> None:
    if not user_id or not institution_id:
        return
    sb = get_supabase()
    sb.table("risk_recompute_queue").upsert(
        {
            "user_id": user_id,
            "institution_id": institution_id,
            "triggered_by": triggered_by,
            "queued_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="user_id",
    ).execute()


def process_risk_recompute_queue(institution_id: str, limit: int = 200) -> dict:
    """Process pending users and clear the queue. Called by cron / dashboard load."""
    from services.risk_service import persist_single_risk_report

    sb = get_supabase()
    rows = (
        sb.table("risk_recompute_queue")
        .select("user_id, triggered_by")
        .eq("institution_id", institution_id)
        .order("queued_at")
        .limit(limit)
        .execute()
    )
    processed = 0
    errors = 0
    for row in rows.data or []:
        uid = row["user_id"]
        try:
            persist_single_risk_report(uid, institution_id)
            sb.table("risk_recompute_queue").delete().eq("user_id", uid).execute()
            processed += 1
        except Exception:
            errors += 1
    return {"processed": processed, "errors": errors, "pending": len(rows.data or [])}
