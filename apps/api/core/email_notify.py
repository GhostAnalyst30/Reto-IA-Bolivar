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
