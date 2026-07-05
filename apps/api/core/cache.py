"""Simple in-process TTL cache for expensive read endpoints."""
import time
from threading import Lock


class TTLCache:
    def __init__(self, ttl_seconds: float = 60.0, max_size: int = 64):
        self.ttl = ttl_seconds
        self.max_size = max_size
        self._data: dict[str, tuple[float, object]] = {}
        self._lock = Lock()

    def get(self, key: str):
        with self._lock:
            entry = self._data.get(key)
            if not entry:
                return None
            ts, val = entry
            if time.monotonic() - ts > self.ttl:
                del self._data[key]
                return None
            return val

    def set(self, key: str, value: object) -> None:
        with self._lock:
            if len(self._data) >= self.max_size:
                oldest = min(self._data, key=lambda k: self._data[k][0])
                del self._data[oldest]
            self._data[key] = (time.monotonic(), value)
