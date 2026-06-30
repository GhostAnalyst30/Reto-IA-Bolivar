"""Chat and student API routes."""
import json
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from core.supabase_client import get_supabase
from core.llm_router import stream_with_fallback
from routes.deps import require_student
from agents.tutor_agent import build_tutor_messages
from agents.path_agent import generate_learning_path
from agents.search_agent import search_resources
from agents.vocational_agent import vocational_reply, get_programs
from services.resource_scraper import search_external, ingest_urls_from_message

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
    await ingest_urls_from_message(body.content, user.get("institution_id"))
    messages = await build_tutor_messages(history.data or [], body.content)

    async def event_generator():
        full = ""
        try:
            yield {"event": "thinking", "data": json.dumps({"message": "Buscando recursos del catálogo…"})}
            async for event in stream_with_fallback(messages):
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
            if full.strip():
                sb.table("messages").insert({
                    "chat_id": chat_id, "role": "assistant", "content": full.strip(),
                }).execute()
                sb.table("chats").update({
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }).eq("id", chat_id).execute()
            yield {"event": "done", "data": json.dumps({"content": full.strip()})}
        except Exception as exc:
            logger_msg = str(exc)
            import logging
            logging.getLogger(__name__).error("Chat stream error: %s", logger_msg)
            fallback = "Lo siento, el servidor no funciona"
            yield {"event": "token", "data": json.dumps({"token": fallback})}
            yield {"event": "done", "data": json.dumps({"content": fallback})}

    return EventSourceResponse(event_generator())


@router.post("/paths")
async def create_path(body: PathCreate, user: dict = Depends(require_student)):
    path_data = await generate_learning_path(body.topic, user["id"], user.get("institution_id"))
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


class VocationalMessage(BaseModel):
    content: str
    assessment_id: str | None = None


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
    sync_student_progress(sb, user["id"])
    result = sb.table("student_progress").select("*").eq("user_id", user["id"]).execute()
    return result.data or []


@router.get("/programs")
async def list_programs(user: dict = Depends(require_student)):
    inst = user.get("institution_id")
    if not inst:
        return []
    return await get_programs(inst)


@router.get("/vocational/assessment")
async def get_vocational(user: dict = Depends(require_student)):
    sb = get_supabase()
    result = sb.table("vocational_assessments").select("*").eq(
        "user_id", user["id"]
    ).order("created_at", desc=True).limit(1).execute()
    return result.data[0] if result.data else None


@router.post("/vocational/message")
async def vocational_message(body: VocationalMessage, user: dict = Depends(require_student)):
    sb = get_supabase()
    inst = user.get("institution_id")
    if not inst:
        raise HTTPException(status_code=400, detail="Vincule una institución primero")

    assessment_id = body.assessment_id
    if not assessment_id:
        created = sb.table("vocational_assessments").insert({
            "user_id": user["id"],
            "institution_id": inst,
            "status": "in_progress",
            "answers": [],
        }).execute()
        assessment_id = created.data[0]["id"]

    assessment = sb.table("vocational_assessments").select("*").eq("id", assessment_id).eq(
        "user_id", user["id"]
    ).single().execute()
    if not assessment.data:
        raise HTTPException(status_code=404)

    answers = assessment.data.get("answers") or []
    history = [{"role": a["role"], "content": a["content"]} for a in answers]
    reasoning, reply, suggested_names = await vocational_reply(history, body.content, inst)

    answers.append({"role": "user", "content": body.content})
    answers.append({"role": "assistant", "content": reply, "reasoning": reasoning})

    programs = await get_programs(inst)
    suggested_ids = [p["id"] for p in programs if p["name"] in suggested_names]
    status = "completed" if len(suggested_ids) >= 1 and len(answers) >= 6 else "in_progress"

    sb.table("vocational_assessments").update({
        "answers": answers,
        "suggested_program_ids": suggested_ids,
        "ai_summary": reply if status == "completed" else None,
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", assessment_id).execute()

    return {
        "assessment_id": assessment_id,
        "reply": reply,
        "reasoning": reasoning,
        "suggested_programs": [p for p in programs if p["id"] in suggested_ids],
        "status": status,
    }
