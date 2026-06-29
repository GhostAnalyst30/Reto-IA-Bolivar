"""Search agent — tsvector fallback."""
from core.supabase_client import get_supabase


async def search_resources(query: str) -> list[dict]:
    sb = get_supabase()
    try:
        result = sb.rpc("search_resources_text", {"search_query": query, "match_count": 20}).execute()
        if result.data:
            return result.data
    except Exception:
        pass

    result = sb.table("resources").select("id, title, description, topic, url").or_(
        f"title.ilike.%{query}%,topic.ilike.%{query}%,description.ilike.%{query}%"
    ).limit(20).execute()
    return result.data or []
