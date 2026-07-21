"""Escalamiento de chats del Digital Twin a psicólogo humano."""
from __future__ import annotations

import time
from datetime import datetime, timezone

from core.config import settings

# Cache corto: no fijar misses para siempre (rompe handoff si el user se crea después).
_COUNSELOR_TTL_S = 60.0
_COUNSELOR_CACHE: dict | None = None
_COUNSELOR_CACHE_AT: float = 0.0


def psychologist_email() -> str:
    return settings.psychologist_email


def invalidate_counselor_cache() -> None:
    global _COUNSELOR_CACHE, _COUNSELOR_CACHE_AT
    _COUNSELOR_CACHE = None
    _COUNSELOR_CACHE_AT = 0.0


def get_counselor_user(sb) -> dict:
    """Carga el perfil del psicólogo desde la tabla users."""
    global _COUNSELOR_CACHE, _COUNSELOR_CACHE_AT
    now = time.monotonic()
    if (
        _COUNSELOR_CACHE is not None
        and _COUNSELOR_CACHE.get("id")
        and (now - _COUNSELOR_CACHE_AT) < _COUNSELOR_TTL_S
    ):
        return _COUNSELOR_CACHE

    # Reintentar DB si el cache era un miss o expiró.
    if (
        _COUNSELOR_CACHE is not None
        and not _COUNSELOR_CACHE.get("id")
        and (now - _COUNSELOR_CACHE_AT) < 5.0
    ):
        return _COUNSELOR_CACHE

    email = psychologist_email()
    try:
        row = (
            sb.table("users")
            .select("id, full_name, email, institution_id, role")
            .eq("email", email)
            .limit(1)
            .execute()
        )
        if not row.data:
            row = (
                sb.table("users")
                .select("id, full_name, email, institution_id, role")
                .eq("role", "psychologist")
                .eq("status", "approved")
                .limit(1)
                .execute()
            )
    except Exception:
        row = type("R", (), {"data": None})()

    if row.data:
        _COUNSELOR_CACHE = row.data[0]
        _COUNSELOR_CACHE_AT = now
        return _COUNSELOR_CACHE

    stub = {
        "id": None,
        "full_name": "Lic. María Fernanda Ortiz",
        "email": email,
        "institution_id": None,
    }
    _COUNSELOR_CACHE = stub
    _COUNSELOR_CACHE_AT = now
    return stub


def counselor_public_profile(counselor: dict) -> dict:
    return {
        "id": counselor.get("id"),
        "full_name": counselor.get("full_name") or "Equipo de bienestar UTB",
        "email": counselor.get("email") or psychologist_email(),
    }


def escalate_chat_to_human(
    sb,
    chat_id: str,
    user_id: str,
    reason: str | None = None,
    *,
    escalation_reason: str | None = None,
) -> dict:
    """Activa handoff humano y vincula/actualiza support_request + CareQueue (idempotente)."""
    now = datetime.now(timezone.utc).isoformat()
    counselor = get_counselor_user(sb)
    reason_text = reason or "Escalamiento a apoyo humano en chat Digital Twin"
    # Tags: llm_exhausted | crisis | student_request | sentinel | handoff
    tag = escalation_reason or "handoff"
    if tag not in reason_text:
        reason_text = f"[{tag}] {reason_text}"

    chat_row = (
        sb.table("chats")
        .select("id, handoff_mode")
        .eq("id", chat_id)
        .limit(1)
        .execute()
    )
    already_human = bool(chat_row.data and chat_row.data[0].get("handoff_mode") == "human")

    if not already_human:
        sb.table("chats").update({
            "handoff_mode": "human",
            "handoff_at": now,
            "updated_at": now,
        }).eq("id", chat_id).execute()
    else:
        sb.table("chats").update({"updated_at": now}).eq("id", chat_id).execute()

    existing = (
        sb.table("support_requests")
        .select("id, reason")
        .eq("chat_id", chat_id)
        .in_("status", ["pending", "assigned"])
        .limit(1)
        .execute()
    )
    payload = {
        "status": "assigned",
        "assigned_to": counselor.get("id"),
        "reason": reason_text,
    }
    if existing.data:
        sb.table("support_requests").update(payload).eq("id", existing.data[0]["id"]).execute()
        support_id = existing.data[0]["id"]
    else:
        # Also reuse any open support request for this user without chat_id.
        open_user = (
            sb.table("support_requests")
            .select("id")
            .eq("user_id", user_id)
            .in_("status", ["pending", "assigned"])
            .is_("chat_id", "null")
            .limit(1)
            .execute()
        )
        if open_user.data:
            sb.table("support_requests").update({
                **payload,
                "chat_id": chat_id,
            }).eq("id", open_user.data[0]["id"]).execute()
            support_id = open_user.data[0]["id"]
        else:
            inserted = sb.table("support_requests").insert({
                "user_id": user_id,
                "chat_id": chat_id,
                **payload,
            }).execute()
            support_id = (inserted.data or [{}])[0].get("id")

    # CareQueue: upsert_ticket already merges open tickets per student (idempotent).
    try:
        from services.care_queue import upsert_ticket
        user_row = sb.table("users").select("institution_id").eq("id", user_id).limit(1).execute()
        inst = (user_row.data or [{}])[0].get("institution_id")
        if inst:
            upsert_ticket(
                institution_id=inst,
                student_id=user_id,
                source="handoff",
                summary=reason_text,
                chat_id=chat_id,
                support_request_id=support_id,
                assigned_to=counselor.get("id"),
                risk_level="alto",
                risk_score=70,
                dominant_cause=tag,
            )
    except Exception:
        pass

    return counselor_public_profile(counselor)
