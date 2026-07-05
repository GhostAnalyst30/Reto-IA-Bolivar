"""Supabase service client."""
from supabase import create_client, Client
from core.config import settings

_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        if not settings.supabase_url or not settings.supabase_service_role_key:
            raise RuntimeError(
                "Supabase credentials not configured "
                "(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)"
            )
        if not settings.supabase_url.startswith("https://"):
            raise RuntimeError("SUPABASE_URL must use https://")
        _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _client


def reset_supabase_client() -> None:
    """Clear cached client after transient connection failures."""
    global _client
    _client = None
