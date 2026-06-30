"""Path agent — generates learning paths with LLM + catalog."""
import json
import re
from core.supabase_client import get_supabase
from core.llm import stream_chat
from core.config import settings


def _rule_based_steps(topic: str, relevant: list[dict]) -> list[dict]:
    steps = []
    for i, res in enumerate(relevant[:6]):
        steps.append({"step_order": i + 1, "title": res["title"], "resource_id": res["id"]})
    if not steps:
        steps = [
            {"step_order": 1, "title": f"Introducción a {topic}", "resource_id": None},
            {"step_order": 2, "title": f"Conceptos clave de {topic}", "resource_id": None},
            {"step_order": 3, "title": f"Práctica en {topic}", "resource_id": None},
            {"step_order": 4, "title": f"Evaluación de {topic}", "resource_id": None},
        ]
    return steps


def _parse_llm_steps(raw: str, relevant: list[dict], topic: str) -> list[dict]:
    match = re.search(r"\[[\s\S]*\]", raw)
    if not match:
        return _rule_based_steps(topic, relevant)
    try:
        parsed = json.loads(match.group())
    except json.JSONDecodeError:
        return _rule_based_steps(topic, relevant)

    valid_ids = {r["id"] for r in relevant}
    steps = []
    for i, item in enumerate(parsed[:6]):
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or f"Paso {i + 1}").strip()
        rid = item.get("resource_id")
        if rid and rid not in valid_ids:
            rid = None
        steps.append({"step_order": i + 1, "title": title, "resource_id": rid})
    return steps or _rule_based_steps(topic, relevant)


async def generate_learning_path(topic: str, user_id: str, institution_id: str | None = None) -> dict:
    sb = get_supabase()
    query = sb.table("resources").select("id, title, topic, description")
    if institution_id:
        query = query.eq("institution_id", institution_id)
    resources = query.limit(30).execute()
    resource_list = resources.data or []

    relevant = [
        r for r in resource_list
        if topic.lower() in (r.get("topic") or "").lower()
        or topic.lower() in r["title"].lower()
        or topic.lower() in (r.get("description") or "").lower()
    ]
    if len(relevant) < 4:
        relevant = resource_list[:8]

    catalog = "\n".join(
        f"- [{r['id']}] {r['title']} ({r.get('topic', '')})"
        for r in relevant[:12]
    )
    llm_messages = [
        {
            "role": "system",
            "content": (
                "Genera una ruta de aprendizaje con 4 a 6 pasos en español. "
                "Responde SOLO un JSON array: "
                '[{"title": "nombre del paso", "resource_id": "uuid-del-recurso-o-null"}]'
            ),
        },
        {
            "role": "user",
            "content": f"Tema: {topic}\nRecursos disponibles:\n{catalog or 'Sin recursos — inventa pasos genéricos.'}",
        },
    ]
    raw = await stream_chat(llm_messages, model=settings.llm_model_path)
    steps = _parse_llm_steps(raw, relevant, topic)

    path = sb.table("learning_paths").insert({
        "user_id": user_id,
        "title": f"Ruta: {topic}",
        "topic": topic,
        "status": "active",
    }).execute()

    path_id = path.data[0]["id"]
    for step in steps:
        sb.table("learning_path_steps").insert({
            "path_id": path_id,
            "step_order": step["step_order"],
            "title": step["title"],
            "resource_id": step.get("resource_id"),
        }).execute()

    full = sb.table("learning_paths").select("*, learning_path_steps(*)").eq("id", path_id).single().execute()
    return full.data
