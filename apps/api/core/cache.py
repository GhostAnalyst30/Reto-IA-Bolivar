"""Multi-namespace TTL cache for expensive read endpoints."""
import time
from threading import Lock


class TTLCache:
    def __init__(self, ttl_seconds: float = 60.0, max_size: int = 256):
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

    def invalidate(self, key: str | None = None) -> None:
        with self._lock:
            if key is None:
                self._data.clear()
            elif key in self._data:
                del self._data[key]

    def invalidate_prefix(self, prefix: str) -> None:
        with self._lock:
            for k in list(self._data):
                if k.startswith(prefix):
                    del self._data[k]


class CacheRegistry:
    """Central registry so services share namespaces and can invalidate together."""

    def __init__(self):
        self._caches: dict[str, TTLCache] = {}
        self._lock = Lock()

    def cache(
        self,
        namespace: str,
        *,
        ttl_seconds: float = 60.0,
        max_size: int = 256,
    ) -> TTLCache:
        with self._lock:
            existing = self._caches.get(namespace)
            if existing:
                return existing
            created = TTLCache(ttl_seconds=ttl_seconds, max_size=max_size)
            self._caches[namespace] = created
            return created

    def invalidate_namespace(self, namespace: str, key: str | None = None) -> None:
        with self._lock:
            cache = self._caches.get(namespace)
        if cache:
            cache.invalidate(key)


registry = CacheRegistry()

# Shared caches — TTLs tuned for read-heavy, eventually-consistent dashboards
user_profile_cache = registry.cache("user_profile", ttl_seconds=120.0, max_size=2048)
dashboard_cache = registry.cache("dashboard", ttl_seconds=120.0, max_size=128)
risk_cache = registry.cache("risk", ttl_seconds=180.0, max_size=128)
platform_cache = registry.cache("platform", ttl_seconds=120.0, max_size=32)
