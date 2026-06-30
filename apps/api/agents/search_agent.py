"""Search agent — tsvector fallback."""
from core.supabase_client import get_supabase


def _escape_ilike(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


async def search_resources(query: str) -> list[dict]:
    sb = get_supabase()
    try:
        result = sb.rpc("search_resources_text", {"search_query": query, "match_count": 20}).execute()
        if result.data:
            rows = result.data
            ids = [r["id"] for r in rows if r.get("id")]
            if ids:
                urls = sb.table("resources").select("id, url").in_("id", ids).execute()
                url_map = {u["id"]: u.get("url") for u in urls.data or []}
                for row in rows:
                    row["url"] = url_map.get(row["id"])
            return rows
    except Exception:
        pass

    safe = _escape_ilike(query)
    result = sb.table("resources").select("id, title, description, topic, url").or_(
        f"title.ilike.%{safe}%,topic.ilike.%{safe}%,description.ilike.%{safe}%"
    ).limit(20).execute()
    return result.data or []
