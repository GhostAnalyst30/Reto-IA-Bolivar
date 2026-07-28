"""Notify users via Next.js internal email API (Brevo)."""
import logging

import httpx

from core.config import settings

logger = logging.getLogger(__name__)


async def _send_internal_email(payload: dict) -> None:
    if not settings.app_url or not settings.internal_register_key:
        logger.debug("Email notify skipped: APP_URL or INTERNAL_REGISTER_KEY not set")
        return

    url = f"{settings.app_url.rstrip('/')}/api/internal/send-email"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                url,
                json=payload,
                headers={"X-Internal-Register-Key": settings.internal_register_key},
            )
            if res.status_code >= 400:
                logger.warning("Email notify failed (%s): %s", res.status_code, res.text)
    except Exception as exc:
        logger.warning("Email notify error: %s", exc)


async def notify_account_approved(email: str, full_name: str, role: str) -> None:
    await _send_internal_email({
        "type": "account_approved",
        "to": email,
        "fullName": full_name,
        "role": role,
    })


async def notify_account_rejected(email: str, full_name: str, reason: str | None = None) -> None:
    await _send_internal_email({
        "type": "account_rejected",
        "to": email,
        "fullName": full_name,
        "reason": reason,
    })


async def notify_appointment_requested(
    *,
    counselor_email: str,
    student_name: str,
    student_email: str,
    proposed_at: str,
    reason: str | None = None,
    for_student: bool = False,
) -> None:
    await _send_internal_email({
        "type": "appointment_requested",
        "to": counselor_email,
        "fullName": student_name,
        "studentEmail": student_email,
        "proposedAt": proposed_at,
        "reason": reason,
        "forStudent": for_student,
    })


async def notify_appointment_confirmed(
    *,
    to_email: str,
    student_name: str,
    proposed_at: str,
    counselor_note: str | None = None,
    role: str = "student",
    student_email: str | None = None,
) -> None:
    await _send_internal_email({
        "type": "appointment_confirmed",
        "to": to_email,
        "fullName": student_name,
        "proposedAt": proposed_at,
        "counselorNote": counselor_note,
        "role": role,
        "studentEmail": student_email,
    })


async def notify_appointment_rejected(
    *,
    to_email: str,
    student_name: str,
    proposed_at: str,
    counselor_note: str | None = None,
    for_counselor: bool = False,
    student_email: str | None = None,
) -> None:
    await _send_internal_email({
        "type": "appointment_rejected",
        "to": to_email,
        "fullName": student_name,
        "proposedAt": proposed_at,
        "counselorNote": counselor_note,
        "forCounselor": for_counselor,
        "studentEmail": student_email,
    })
