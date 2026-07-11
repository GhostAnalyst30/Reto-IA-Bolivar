"""Background task runner for CPU/IO-heavy work without blocking HTTP handlers."""
from __future__ import annotations

import asyncio
import logging
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable

logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="heavy-task")
_semaphore = asyncio.Semaphore(8)
_jobs: dict[str, dict[str, Any]] = {}
_jobs_lock = asyncio.Lock()


async def _set_job(job_id: str, payload: dict[str, Any]) -> None:
    async with _jobs_lock:
        _jobs[job_id] = payload


async def get_job(job_id: str) -> dict[str, Any] | None:
    async with _jobs_lock:
        return _jobs.get(job_id)


async def run_in_background(
    fn: Callable[..., Any],
    *args: Any,
    job_id: str | None = None,
    **kwargs: Any,
) -> str:
    """Schedule a blocking function on the thread pool; returns job_id."""
    jid = job_id or str(uuid.uuid4())
    await _set_job(jid, {"status": "queued", "created_at": time.time()})

    async def _runner() -> None:
        await _set_job(jid, {"status": "running", "started_at": time.time()})
        try:
            async with _semaphore:
                loop = asyncio.get_running_loop()
                result = await loop.run_in_executor(
                    _executor,
                    lambda: fn(*args, **kwargs),
                )
            await _set_job(
                jid,
                {"status": "completed", "result": result, "finished_at": time.time()},
            )
        except Exception as exc:
            logger.exception("Background job %s failed", jid)
            await _set_job(
                jid,
                {"status": "failed", "error": str(exc), "finished_at": time.time()},
            )

    asyncio.create_task(_runner())
    return jid


def prune_old_jobs(max_age_seconds: float = 3600.0) -> int:
    """Drop completed/failed job records older than max_age_seconds."""
    cutoff = time.time() - max_age_seconds
    removed = 0
    for jid, job in list(_jobs.items()):
        finished = job.get("finished_at") or job.get("created_at", 0)
        if finished < cutoff and job.get("status") in ("completed", "failed"):
            del _jobs[jid]
            removed += 1
    return removed
