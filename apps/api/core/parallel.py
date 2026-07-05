"""Run blocking Supabase calls concurrently."""
from concurrent.futures import ThreadPoolExecutor
from typing import Callable, TypeVar

T = TypeVar("T")


def run_parallel(*callables: Callable[[], T], max_workers: int | None = None) -> list[T]:
    if not callables:
        return []
    workers = max_workers or min(len(callables), 8)
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(fn) for fn in callables]
        return [f.result() for f in futures]
