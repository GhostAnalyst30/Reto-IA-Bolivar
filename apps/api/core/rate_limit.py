"""In-memory sliding-window rate limiter for chat endpoints."""
from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException

from core.config import settings
from core.security_monitor import log_security_event
from routes.deps import get_user_dep

_windows: dict[str, deque[float]] = defaultdict(deque)


def _rate_key(user_id: str, endpoint: str) -> str:
    return f"{user_id}:{endpoint}"


def check_rate_limit(user_id: str, endpoint: str, limit: int | None = None) -> None:
    limit = limit or settings.chat_rate_limit_per_minute
    now = time.monotonic()
    window_sec = 60.0
    key = _rate_key(user_id, endpoint)
    q = _windows[key]
    while q and now - q[0] > window_sec:
        q.popleft()
    if len(q) >= limit:
        log_security_event(
            "rate_limit_exceeded",
            severity="medium",
            user_id=user_id,
            details={"endpoint": endpoint, "limit": limit},
        )
        raise HTTPException(
            status_code=429,
            detail="Demasiados mensajes. Espera un momento antes de continuar.",
        )
    q.append(now)


async def require_chat_rate_limit(user: dict = Depends(get_user_dep)) -> dict:
    check_rate_limit(user["id"], "chat")
    return user


async def require_institutional_chat_rate_limit(user: dict = Depends(get_user_dep)) -> dict:
    check_rate_limit(user["id"], "institutional_chat")
    return user
