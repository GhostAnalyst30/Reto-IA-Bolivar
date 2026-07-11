"""Educational resource scraper — YouTube, Khan Academy, W3Schools, edX."""
import re
from datetime import datetime, timezone
from urllib.parse import quote_plus

import httpx

from core.config import settings
from core.supabase_client import get_supabase

URL_PATTERN = re.compile(r"https?://[^\s<>\"']+")


async def scrape_youtube(query: str, limit: int = 5) -> list[dict]:
    if not settings.youtube_api_key:
        return []
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={
                "part": "snippet",
                "q": query,
                "type": "video",
                "maxResults": limit,
                "key": settings.youtube_api_key,
            },
        )
        if res.status_code != 200:
            return []
        items = res.json().get("items", [])
        return [
            {
                "title": i["snippet"]["title"],
                "description": i["snippet"].get("description", "")[:300],
                "url": f"https://www.youtube.com/watch?v={i['id']['videoId']}",
                "topic": query[:80],
                "resource_type": "video",
                "source": "youtube",
            }
            for i in items
        ]


async def scrape_khan(query: str, limit: int = 5) -> list[dict]:
    results = []
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            res = await client.get(
                f"https://www.khanacademy.org/search?page_search_query={quote_plus(query)}"
            )
            if res.status_code == 200:
                titles = re.findall(r'"translatedTitle":"([^"]+)"', res.text)[:limit]
                urls = re.findall(r'"url":"(/[^"]+)"', res.text)[:limit]
                for t, u in zip(titles, urls):
                    results.append({
                        "title": t,
                        "description": f"Recurso Khan Academy sobre {query}",
                        "url": f"https://www.khanacademy.org{u}",
                        "topic": query[:80],
                        "resource_type": "course",
                        "source": "khan_academy",
                    })
    except Exception:
        pass
    return results


async def scrape_w3schools(query: str, limit: int = 3) -> list[dict]:
    q = query.lower()
    topics = {
        "html": "https://www.w3schools.com/html/",
        "css": "https://www.w3schools.com/css/",
        "javascript": "https://www.w3schools.com/js/",
        "python": "https://www.w3schools.com/python/",
        "sql": "https://www.w3schools.com/sql/",
    }
    results = []
    for key, url in topics.items():
        if key in q or q in key:
            results.append({
                "title": f"W3Schools — {key.upper()}",
                "description": f"Tutorial interactivo de {key}",
                "url": url,
                "topic": key,
                "resource_type": "tutorial",
                "source": "w3schools",
            })
    return results[:limit]


async def scrape_edx(query: str, limit: int = 3) -> list[dict]:
    results = []
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.get(
                "https://courses.edx.org/api/courses/v1/courses/",
                params={"search": query, "page_size": limit},
            )
            if res.status_code == 200:
                for c in res.json().get("results", [])[:limit]:
                    marketing = c.get("marketing_url") or ""
                    url = f"https://www.edx.org{marketing}" if marketing else f"https://www.edx.org/search?q={quote_plus(query)}"
                    results.append({
                        "title": c.get("name", query),
                        "description": (c.get("short_description") or "")[:300],
                        "url": url,
                        "topic": query[:80],
                        "resource_type": "course",
                        "source": "edx",
                    })
    except Exception:
        pass
    return results


async def scrape_utb_biblioteca(institution_id: str | None = None) -> list[dict]:
    """Scrape links from UTB Biblioteca Digital."""
    base_url = "https://www.utb.edu.co/biblioteca-utb/biblioteca-digital/"
    results: list[dict] = []
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            res = await client.get(base_url, headers={"User-Agent": "UTB-Te-Acompana-Bot/1.0"})
            if res.status_code != 200:
                return []
            # Extract href links with meaningful text
            links = re.findall(
                r'<a[^>]+href="([^"]+)"[^>]*>([^<]{4,120})</a>',
                res.text,
                re.IGNORECASE,
            )
            seen: set[str] = set()
            for href, title in links:
                title = re.sub(r"\s+", " ", title).strip()
                if not title or len(title) < 4:
                    continue
                if href.startswith("#") or href.startswith("javascript"):
                    continue
                if href.startswith("/"):
                    url = f"https://www.utb.edu.co{href}"
                elif href.startswith("http"):
                    url = href
                else:
                    continue
                if "utb.edu.co" not in url and not any(
                    d in url for d in ("doi.org", "redalyc", "scielo", "jstor", "ebsco", "proquest")
                ):
                    continue
                if url in seen:
                    continue
                seen.add(url)
                results.append({
                    "title": title[:500],
                    "description": f"Recurso de la Biblioteca Digital UTB: {title[:200]}",
                    "url": url,
                    "topic": "biblioteca",
                    "category": "biblioteca",
                    "resource_type": "link",
                    "source": "utb_biblioteca",
                })
                if len(results) >= 40:
                    break
    except Exception:
        pass
    return await persist_resources(results, institution_id)


async def search_external(query: str, institution_id: str | None = None) -> list[dict]:
    if not settings.scraper_enabled:
        return []
    all_results: list[dict] = []
    for fn in (scrape_youtube, scrape_khan, scrape_w3schools, scrape_edx):
        try:
            all_results.extend(await fn(query))
        except Exception:
            continue
    return await persist_resources(all_results, institution_id)


async def persist_resources(items: list[dict], institution_id: str | None) -> list[dict]:
    sb = get_supabase()
    saved = []
    now = datetime.now(timezone.utc).isoformat()
    for item in items:
        if not item.get("url"):
            continue
        existing = sb.table("resources").select("id").eq("url", item["url"]).limit(1).execute()
        if existing.data:
            saved.append({**item, "id": existing.data[0]["id"]})
            continue
        row = {
            "title": item["title"][:500],
            "description": item.get("description", "")[:1000],
            "url": item["url"],
            "topic": item.get("topic", "general"),
            "category": item.get("category", "general"),
            "resource_type": item.get("resource_type", "article"),
            "source": item.get("source", "scraped"),
            "scraped_at": now,
            "institution_id": institution_id,
        }
        ins = sb.table("resources").insert(row).execute()
        if ins.data:
            saved.append(ins.data[0])
    return saved


def extract_urls(text: str) -> list[str]:
    return URL_PATTERN.findall(text)


async def ingest_urls_from_message(text: str, institution_id: str | None) -> list[dict]:
    urls = extract_urls(text)
    if not urls:
        return []
    items = []
    for url in urls[:3]:
        if "youtube.com" in url or "youtu.be" in url:
            items.append({
                "title": "Video educativo",
                "description": url,
                "url": url,
                "topic": "video",
                "resource_type": "video",
                "source": "youtube",
            })
        elif "khanacademy" in url:
            items.append({"title": "Khan Academy", "description": url, "url": url, "topic": "khan", "resource_type": "course", "source": "khan_academy"})
        elif "w3schools" in url:
            items.append({"title": "W3Schools", "description": url, "url": url, "topic": "web", "resource_type": "tutorial", "source": "w3schools"})
        elif "edx.org" in url:
            items.append({"title": "edX Course", "description": url, "url": url, "topic": "course", "resource_type": "course", "source": "edx"})
    return await persist_resources(items, institution_id)
