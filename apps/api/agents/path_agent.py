"""Path agent — generates learning paths."""
from core.supabase_client import get_supabase
from core.llm import stream_chat
from core.config import settings


async def generate_learning_path(topic: str, user_id: str) -> dict:
    sb = get_supabase()
    resources = sb.table("resources").select("id, title, topic").limit(20).execute()
    resource_list = resources.data or []

    relevant = [r for r in resource_list if topic.lower() in (r.get("topic") or "").lower() or topic.lower() in r["title"].lower()]
    if len(relevant) < 4:
        relevant = resource_list[:6]

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
