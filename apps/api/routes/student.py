"""Chat and student API routes."""
import json
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from core.supabase_client import get_supabase
from core.llm_router import stream_with_fallback, _chunk_text
from routes.deps import require_student
from agents.digital_twin_agent import build_digital_twin_messages
from services.psychologist_fallback import build_counselor_response
from agents.path_agent import generate_learning_path
from agents.search_agent import search_resources
from agents.vocational_agent import get_programs
from services.resource_scraper import search_external, ingest_urls_from_message

router = APIRouter(tags=["student"])

# Máximo de mensajes del usuario por conversación; luego se sugiere iniciar un chat nuevo
MAX_USER_MESSAGES_PER_CHAT = 15


class ChatCreate(BaseModel):
    title: str | None = None
    chat_type: str = "digital_twin"


class MessageCreate(BaseModel):
    content: str


class PathCreate(BaseModel):
    topic: str


class SearchQuery(BaseModel):
    q: str


def sync_student_progress(sb, user_id: str, institution_id: str | None = None) -> None:
    old_progress: dict[str, int] = {}
    if institution_id:
        prev = sb.table("student_progress").select("topic, progress_percent").eq(
            "user_id", user_id
        ).execute()
        for p in prev.data or []:
            old_progress[p["topic"]] = int(p.get("progress_percent") or 0)

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

    if not by_topic:
        return

    now = datetime.now(timezone.utc).isoformat()
    rows = [
        {
            "user_id": user_id,
            "topic": topic,
            "progress_percent": pct,
            "updated_at": now,
        }
        for topic, pct in by_topic.items()
    ]
    sb.table("student_progress").upsert(rows, on_conflict="user_id,topic").execute()

    if institution_id:
        from services.risk_service import maybe_recompute_on_progress
        for topic, pct in by_topic.items():
            maybe_recompute_on_progress(user_id, institution_id, pct, old_progress.get(topic))


class SupportRequestCreate(BaseModel):
    chat_id: str | None = None
    reason: str


class MoodCheckinCreate(BaseModel):
    mood_score: int
    note: str | None = None


@router.get("/chats")
async def list_chats(user: dict = Depends(require_student), chat_type: str | None = Query(None)):
    sb = get_supabase()
    query = sb.table("chats").select("*").eq("user_id", user["id"])
    if chat_type:
        query = query.eq("chat_type", chat_type)
    result = query.order("updated_at", desc=True).execute()
    return result.data or []


@router.post("/chats")
async def create_chat(body: ChatCreate, user: dict = Depends(require_student)):
    sb = get_supabase()
    result = sb.table("chats").insert({
        "user_id": user["id"],
        "title": body.title or "Nueva conversación",
        "chat_type": body.chat_type,
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

    sent = sb.table("messages").select("id", count="exact").eq(
        "chat_id", chat_id
    ).eq("role", "user").execute()
    if (sent.count or 0) >= MAX_USER_MESSAGES_PER_CHAT:
        raise HTTPException(
            status_code=409,
            detail="Esta conversación alcanzó el máximo de 15 mensajes. Inicia un chat nuevo para continuar.",
        )

    sb.table("messages").insert({"chat_id": chat_id, "role": "user", "content": body.content}).execute()

    history = sb.table("messages").select("role, content").eq("chat_id", chat_id).order("created_at").execute()
    messages, _ = await build_digital_twin_messages(history.data or [], body.content, user["id"])

    async def event_generator():
        full = ""
        is_counselor = False
        counselor_fn = lambda: build_counselor_response(body.content, user)
        try:
            yield {"event": "thinking", "data": json.dumps({"message": "Buscando recursos del catálogo…"})}
            async for event in stream_with_fallback(messages, fallback=counselor_fn):
                et = event.get("type")
                if et == "thinking":
                    yield {"event": "thinking", "data": json.dumps({"message": event.get("message", "")})}
                elif et == "reasoning":
                    yield {"event": "reasoning", "data": json.dumps({"content": event.get("content", "")})}
                elif et == "token":
                    token = event.get("content", "")
                    full += token
                    yield {"event": "token", "data": json.dumps({"token": token})}
                elif et == "done":
                    full = event.get("content", full)
                    is_counselor = bool(event.get("counselor"))
            if not full.strip():
                full = counselor_fn()
                is_counselor = True
                for chunk in _chunk_text(full):
                    yield {"event": "token", "data": json.dumps({"token": chunk})}
            if full.strip():
                sb.table("messages").insert({
                    "chat_id": chat_id,
                    "role": "counselor" if is_counselor else "assistant",
                    "content": full.strip(),
                }).execute()
                sb.table("chats").update({
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }).eq("id", chat_id).execute()
            yield {"event": "done", "data": json.dumps({"content": full.strip(), "counselor": is_counselor})}
        except Exception as exc:
            import logging
            logging.getLogger(__name__).error("Chat stream error: %s", exc)
            full = counselor_fn()
            is_counselor = True
            for chunk in _chunk_text(full):
                yield {"event": "token", "data": json.dumps({"token": chunk})}
            sb.table("messages").insert({
                "chat_id": chat_id,
                "role": "counselor",
                "content": full.strip(),
            }).execute()
            sb.table("chats").update({
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", chat_id).execute()
            yield {"event": "done", "data": json.dumps({"content": full.strip(), "counselor": True})}

    return EventSourceResponse(event_generator())


@router.post("/paths")
async def create_path(body: PathCreate, user: dict = Depends(require_student)):
    path_data = await generate_learning_path(body.topic, user["id"], user.get("institution_id"))
    sb = get_supabase()
    sync_student_progress(sb, user["id"], user.get("institution_id"))
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
    sync_student_progress(sb, user["id"], user.get("institution_id"))
    return {"completed": True}


@router.post("/search")
async def search(body: SearchQuery, user: dict = Depends(require_student)):
    local = await search_resources(body.q)
    if len(local) < 5:
        scraped = await search_external(body.q, user.get("institution_id"))
        seen = {r.get("id") for r in local}
        for s in scraped:
            if s.get("id") not in seen:
                local.append(s)
    return local


@router.get("/resources")
async def list_resources(user: dict = Depends(require_student), type: str | None = Query(None), category: str | None = Query(None)):
    sb = get_supabase()
    query = sb.table("resources").select("id, title, description, topic, url, resource_type, category")
    if user.get("institution_id"):
        query = query.eq("institution_id", user["institution_id"])
    if type:
        query = query.eq("resource_type", type)
    if category:
        query = query.eq("category", category)
    result = query.limit(50).execute()
    return result.data or []


@router.post("/support-requests")
async def create_support_request(body: SupportRequestCreate, user: dict = Depends(require_student)):
    sb = get_supabase()
    result = sb.table("support_requests").insert({
        "user_id": user["id"],
        "chat_id": body.chat_id,
        "reason": body.reason,
    }).execute()
    inst = user.get("institution_id")
    if inst:
        try:
            from services.risk_service import persist_single_risk_report
            persist_single_risk_report(user["id"], inst)
        except Exception:
            pass
    return result.data[0]


@router.post("/mood-checkins")
async def create_mood_checkin(body: MoodCheckinCreate, user: dict = Depends(require_student)):
    if body.mood_score < 1 or body.mood_score > 5:
        raise HTTPException(status_code=400, detail="Puntuación entre 1 y 5")
    sb = get_supabase()
    result = sb.table("mood_checkins").insert({
        "user_id": user["id"],
        "mood_score": body.mood_score,
        "note": body.note,
    }).execute()
    inst = user.get("institution_id")
    if inst:
        try:
            from services.risk_service import persist_single_risk_report
            persist_single_risk_report(user["id"], inst)
        except Exception:
            pass
    return result.data[0]


@router.get("/mood-checkins")
async def list_mood_checkins(user: dict = Depends(require_student)):
    sb = get_supabase()
    result = sb.table("mood_checkins").select("*").eq("user_id", user["id"]).order(
        "created_at", desc=True
    ).limit(30).execute()
    return result.data or []


@router.get("/self-help")
async def self_help_resources(user: dict = Depends(require_student), topic: str = Query("bienestar")):
    results = await search_resources(topic)
    if not results and topic != "bienestar":
        results = await search_resources("bienestar")
    return results


@router.get("/saved-resources")
async def saved_resources(user: dict = Depends(require_student)):
    sb = get_supabase()
    result = sb.table("saved_resources").select("*, resources(*)").eq("user_id", user["id"]).execute()
    return result.data or []


@router.post("/saved-resources/{resource_id}")
async def save_resource(resource_id: str, user: dict = Depends(require_student)):
    sb = get_supabase()
    resource = sb.table("resources").select("id, institution_id").eq("id", resource_id).single().execute()
    if not resource.data:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    inst = user.get("institution_id")
    res_inst = resource.data.get("institution_id")
    if res_inst and inst and res_inst != inst:
        raise HTTPException(status_code=403, detail="Recurso de otra institución")
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
    sync_student_progress(sb, user["id"], user.get("institution_id"))
    result = sb.table("student_progress").select("*").eq("user_id", user["id"]).execute()
    return result.data or []


@router.get("/programs")
async def list_programs(user: dict = Depends(require_student)):
    inst = user.get("institution_id")
    if not inst:
        return []
    return await get_programs(inst)
