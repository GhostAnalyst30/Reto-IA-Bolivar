"""Chat and student API routes."""
import json
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from core.supabase_client import get_supabase
from core.llm import stream_chat_generator
from routes.deps import require_student
from agents.tutor_agent import build_tutor_messages
from agents.path_agent import generate_learning_path
from agents.search_agent import search_resources

router = APIRouter(tags=["student"])


class ChatCreate(BaseModel):
    title: str | None = None


class MessageCreate(BaseModel):
    content: str


class PathCreate(BaseModel):
    topic: str


class SearchQuery(BaseModel):
    q: str


def sync_student_progress(sb, user_id: str) -> None:
    paths = sb.table("learning_paths").select(
        "topic, learning_path_steps(completed)"
    ).eq("user_id", user_id).execute()

    by_topic: dict[str, int] = {}
    for path in paths.data or []:
        steps = path.get("learning_path_steps") or []
        if not steps:
            continue
        done = sum(1 for s in steps if s.get("completed"))
        pct = int(done / len(steps) * 100)
        topic = path["topic"]
        by_topic[topic] = max(by_topic.get(topic, 0), pct)

    now = datetime.now(timezone.utc).isoformat()
    for topic, pct in by_topic.items():
        sb.table("student_progress").upsert({
            "user_id": user_id,
            "topic": topic,
            "progress_percent": pct,
            "updated_at": now,
        }, on_conflict="user_id,topic").execute()


@router.get("/chats")
async def list_chats(user: dict = Depends(require_student)):
    sb = get_supabase()
    result = sb.table("chats").select("*").eq("user_id", user["id"]).order("updated_at", desc=True).execute()
    return result.data or []


@router.post("/chats")
async def create_chat(body: ChatCreate, user: dict = Depends(require_student)):
    sb = get_supabase()
    result = sb.table("chats").insert({
        "user_id": user["id"],
        "title": body.title or "Nueva conversación",
    }).execute()
    return result.data[0]


@router.get("/chats/{chat_id}/messages")
async def get_messages(chat_id: str, user: dict = Depends(require_student)):
    sb = get_supabase()
    chat = sb.table("chats").select("id").eq("id", chat_id).eq("user_id", user["id"]).single().execute()
    if not chat.data:
        raise HTTPException(status_code=404, detail="Chat not found")
    result = sb.table("messages").select("*").eq("chat_id", chat_id).order("created_at").execute()
    return result.data or []


@router.post("/chats/{chat_id}/messages")
async def send_message(chat_id: str, body: MessageCreate, user: dict = Depends(require_student)):
    sb = get_supabase()
    chat = sb.table("chats").select("*").eq("id", chat_id).eq("user_id", user["id"]).single().execute()
    if not chat.data:
        raise HTTPException(status_code=404, detail="Chat not found")

    sb.table("messages").insert({"chat_id": chat_id, "role": "user", "content": body.content}).execute()

    history = sb.table("messages").select("role, content").eq("chat_id", chat_id).order("created_at").execute()
    messages = await build_tutor_messages(history.data or [], body.content)

    async def event_generator():
        full = ""
        try:
            async for token in stream_chat_generator(messages):
                full += token
                yield {"event": "token", "data": json.dumps({"token": token})}
            if full.strip():
                sb.table("messages").insert({
                    "chat_id": chat_id, "role": "assistant", "content": full,
                }).execute()
                sb.table("chats").update({
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }).eq("id", chat_id).execute()
            yield {"event": "done", "data": json.dumps({"content": full})}
        except Exception as exc:
            yield {"event": "error", "data": json.dumps({"message": str(exc)})}

    return EventSourceResponse(event_generator())


@router.post("/paths")
async def create_path(body: PathCreate, user: dict = Depends(require_student)):
    path_data = await generate_learning_path(body.topic, user["id"])
    sb = get_supabase()
    sync_student_progress(sb, user["id"])
    return path_data


@router.get("/paths")
async def list_paths(user: dict = Depends(require_student)):
    sb = get_supabase()
    paths = sb.table("learning_paths").select("*, learning_path_steps(*)").eq("user_id", user["id"]).execute()
    return paths.data or []


@router.get("/paths/{path_id}")
async def get_path(path_id: str, user: dict = Depends(require_student)):
    sb = get_supabase()
    path = sb.table("learning_paths").select("*, learning_path_steps(*)").eq("id", path_id).eq("user_id", user["id"]).single().execute()
    if not path.data:
        raise HTTPException(status_code=404)
    return path.data


@router.patch("/paths/{path_id}/steps/{step_id}")
async def complete_step(path_id: str, step_id: str, user: dict = Depends(require_student)):
    sb = get_supabase()
    path = sb.table("learning_paths").select("id").eq("id", path_id).eq("user_id", user["id"]).single().execute()
    if not path.data:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    step = sb.table("learning_path_steps").select("id").eq("id", step_id).eq("path_id", path_id).single().execute()
    if not step.data:
        raise HTTPException(status_code=404, detail="Paso no encontrado")

    sb.table("learning_path_steps").update({"completed": True}).eq("id", step_id).execute()
    sync_student_progress(sb, user["id"])
    return {"completed": True}


@router.post("/search")
async def search(body: SearchQuery, user: dict = Depends(require_student)):
    return await search_resources(body.q)


@router.get("/resources")
async def list_resources(user: dict = Depends(require_student)):
    sb = get_supabase()
    query = sb.table("resources").select("id, title, description, topic, url, resource_type")
    if user.get("institution_id"):
        query = query.eq("institution_id", user["institution_id"])
    result = query.limit(50).execute()
    return result.data or []


@router.get("/saved-resources")
async def saved_resources(user: dict = Depends(require_student)):
    sb = get_supabase()
    result = sb.table("saved_resources").select("*, resources(*)").eq("user_id", user["id"]).execute()
    return result.data or []


@router.post("/saved-resources/{resource_id}")
async def save_resource(resource_id: str, user: dict = Depends(require_student)):
    sb = get_supabase()
    sb.table("saved_resources").upsert(
        {"user_id": user["id"], "resource_id": resource_id},
        on_conflict="user_id,resource_id",
    ).execute()
    return {"saved": True}


@router.delete("/saved-resources/{resource_id}")
async def unsave_resource(resource_id: str, user: dict = Depends(require_student)):
    sb = get_supabase()
    sb.table("saved_resources").delete().eq("user_id", user["id"]).eq("resource_id", resource_id).execute()
    return {"saved": False}


@router.get("/progress")
async def get_progress(user: dict = Depends(require_student)):
    sb = get_supabase()
    sync_student_progress(sb, user["id"])
    result = sb.table("student_progress").select("*").eq("user_id", user["id"]).execute()
    return result.data or []
