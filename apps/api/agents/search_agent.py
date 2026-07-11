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
            missing_url_ids = [r["id"] for r in rows if r.get("id") and not r.get("url")]
            if missing_url_ids:
                urls = sb.table("resources").select("id, url, source, category").in_("id", missing_url_ids).execute()
                url_map = {u["id"]: u for u in urls.data or []}
                for row in rows:
                    if not row.get("url"):
                        row["url"] = url_map.get(row["id"], {}).get("url")
                    meta = url_map.get(row["id"], {})
                    row.setdefault("source", meta.get("source"))
                    row.setdefault("category", meta.get("category"))
            utb = [r for r in rows if r.get("source") == "utb_biblioteca" or r.get("category") == "biblioteca"]
            rest = [r for r in rows if r not in utb]
            return (utb + rest)[:20]
    except Exception:
        pass

    safe = _escape_ilike(query)
    result = sb.table("resources").select("id, title, description, topic, url, source, category").or_(
        f"title.ilike.%{safe}%,topic.ilike.%{safe}%,description.ilike.%{safe}%"
    ).limit(30).execute()
    rows = result.data or []
    # Priorizar Biblioteca Digital UTB
    utb = [r for r in rows if r.get("source") == "utb_biblioteca" or r.get("category") == "biblioteca"]
    rest = [r for r in rows if r not in utb]
    return (utb + rest)[:20]
