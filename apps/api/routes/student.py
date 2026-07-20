"""Chat and student API routes."""
import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from core.supabase_client import get_supabase
from core.llm_router import stream_with_fallback, FALLBACK_MESSAGE, _chunk_text
from core.rate_limit import check_rate_limit
from routes.deps import require_student
from agents.digital_twin_agent import build_digital_twin_messages
from agents.vocational_agent import get_programs
from services.chat_handoff import escalate_chat_to_human, counselor_public_profile, get_counselor_user
from services.llm_guardrails import check_input, check_output, scrub_context_for_llm
from services.risk_queue import enqueue_risk_recompute

router = APIRouter(tags=["student"])
logger = logging.getLogger(__name__)

# Máximo de mensajes del usuario por conversación; luego se sugiere iniciar un chat nuevo
MAX_USER_MESSAGES_PER_CHAT = 15


class ChatCreate(BaseModel):
    title: str | None = None
    chat_type: str = "digital_twin"


class MessageCreate(BaseModel):
    content: str


class HandoffCreate(BaseModel):
    reason: str | None = None


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


def _enrich_messages(sb, messages: list[dict]) -> list[dict]:
    author_ids = {m["author_id"] for m in messages if m.get("author_id")}
    authors: dict[str, dict] = {}
    if author_ids:
        users = sb.table("users").select("id, full_name, email").in_("id", list(author_ids)).execute()
        authors = {u["id"]: u for u in (users.data or [])}
    counselor = get_counselor_user(sb)
    out = []
    for m in messages:
        row = dict(m)
        aid = row.get("author_id")
        if aid and aid in authors:
            row["author"] = authors[aid]
        elif row.get("role") == "counselor" and not aid:
            row["author"] = counselor_public_profile(counselor)
        out.append(row)
    return out


def _handoff_payload(counselor: dict) -> dict:
    return {
        "handoff_mode": "human",
        "counselor": counselor_public_profile(counselor),
    }


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
    chat = sb.table("chats").select("*").eq("id", chat_id).eq("user_id", user["id"]).single().execute()
    if not chat.data:
        raise HTTPException(status_code=404, detail="Chat not found")
    result = sb.table("messages").select("*").eq("chat_id", chat_id).order("created_at").execute()
    return {
        "chat": {
            "id": chat.data["id"],
            "handoff_mode": chat.data.get("handoff_mode", "ai"),
            "handoff_at": chat.data.get("handoff_at"),
        },
        "messages": _enrich_messages(sb, result.data or []),
    }


@router.post("/chats/{chat_id}/handoff")
async def request_handoff(chat_id: str, body: HandoffCreate, user: dict = Depends(require_student)):
    sb = get_supabase()
    chat = sb.table("chats").select("*").eq("id", chat_id).eq("user_id", user["id"]).single().execute()
    if not chat.data:
        raise HTTPException(status_code=404, detail="Chat not found")
    if chat.data.get("handoff_mode") == "resolved":
        raise HTTPException(status_code=409, detail="Esta conversación fue cerrada. Inicia un chat nuevo.")

    counselor = escalate_chat_to_human(
        sb, chat_id, user["id"], body.reason or "El estudiante solicitó hablar con una persona"
    )
    inst = user.get("institution_id")
    if inst:
        try:
            enqueue_risk_recompute(user["id"], inst, triggered_by="student_action")
        except Exception:
            pass
    return _handoff_payload(counselor)


@router.post("/chats/{chat_id}/messages")
async def send_message(chat_id: str, body: MessageCreate, user: dict = Depends(require_student)):
    check_rate_limit(user["id"], "chat")
    sb = get_supabase()
    chat = sb.table("chats").select("*").eq("id", chat_id).eq("user_id", user["id"]).single().execute()
    if not chat.data:
        raise HTTPException(status_code=404, detail="Chat not found")

    if chat.data.get("handoff_mode") == "resolved":
        raise HTTPException(
            status_code=409,
            detail="Esta conversación fue cerrada por bienestar. Inicia un chat nuevo para continuar.",
        )

    sent = sb.table("messages").select("id", count="exact").eq(
        "chat_id", chat_id
    ).eq("role", "user").execute()
    if (sent.count or 0) >= MAX_USER_MESSAGES_PER_CHAT:
        raise HTTPException(
            status_code=409,
            detail="Esta conversación alcanzó el máximo de 15 mensajes. Inicia un chat nuevo para continuar.",
        )

    handoff_mode = chat.data.get("handoff_mode", "ai")
    now = datetime.now(timezone.utc).isoformat()

    history_rows = sb.table("messages").select("role, content").eq(
        "chat_id", chat_id
    ).order("created_at").execute()
    recent_user_msgs = [
        m["content"] for m in (history_rows.data or []) if m.get("role") == "user"
    ]

    def _save_assistant(content: str):
        sb.table("messages").insert({
            "chat_id": chat_id,
            "role": "assistant",
            "content": content,
        }).execute()
        sb.table("chats").update({"updated_at": now}).eq("id", chat_id).execute()

    async def _yield_text_as_sse(text: str, extra: dict | None = None):
        payload = extra or {}
        for chunk in _chunk_text(text):
            yield {"event": "token", "data": json.dumps({"token": chunk})}
        yield {"event": "done", "data": json.dumps({"content": text, **payload})}

    async def event_generator():
        if handoff_mode == "human":
            sb.table("messages").insert({"chat_id": chat_id, "role": "user", "content": body.content}).execute()
            sb.table("chats").update({"updated_at": now}).eq("id", chat_id).execute()
            counselor = get_counselor_user(sb)
            payload = _handoff_payload(counselor)
            yield {"event": "handoff_waiting", "data": json.dumps(payload)}
            yield {"event": "done", "data": json.dumps({**payload, "content": ""})}
            return

        input_check = check_input(
            body.content,
            "digital_twin",
            history=recent_user_msgs,
            user_id=user["id"],
        )

        sb.table("messages").insert({"chat_id": chat_id, "role": "user", "content": body.content}).execute()
        sb.table("chats").update({"updated_at": now}).eq("id", chat_id).execute()

        if input_check.action == "handoff":
            escalate_chat_to_human(
                sb, chat_id, user["id"], "Señales de crisis detectadas por guardrails"
            )
            counselor = get_counselor_user(sb)
            payload = _handoff_payload(counselor)
            msg = input_check.user_message or ""
            if msg:
                _save_assistant(msg)
                for chunk in _chunk_text(msg):
                    yield {"event": "token", "data": json.dumps({"token": chunk})}
            yield {"event": "handoff_waiting", "data": json.dumps(payload)}
            yield {"event": "done", "data": json.dumps({**payload, "content": msg, "guardrail": "crisis"})}
            return

        if input_check.action in ("block", "redirect"):
            reply = input_check.user_message or ""
            _save_assistant(reply)
            yield {"event": "guardrail", "data": json.dumps({
                "action": input_check.action,
                "flags": input_check.flags,
                "privacy_notice": input_check.privacy_notice,
            })}
            async for ev in _yield_text_as_sse(reply, {"guardrail": input_check.action}):
                yield ev
            return

        llm_user_text = input_check.redacted_input or body.content
        history = sb.table("messages").select("role, content").eq(
            "chat_id", chat_id
        ).order("created_at").execute()
        messages, _ = await build_digital_twin_messages(
            history.data or [], llm_user_text, user["id"]
        )
        messages = scrub_context_for_llm(messages)

        if input_check.privacy_notice:
            yield {"event": "guardrail", "data": json.dumps({
                "action": "sanitize",
                "flags": input_check.flags,
                "privacy_notice": input_check.privacy_notice,
            })}

        async def _emit_handoff(reason: str):
            counselor = escalate_chat_to_human(sb, chat_id, user["id"], reason)
            payload = _handoff_payload(counselor)
            yield {"event": "handoff_waiting", "data": json.dumps(payload)}
            yield {"event": "done", "data": json.dumps({**payload, "content": ""})}

        try:
            yield {"event": "thinking", "data": json.dumps({"message": "Buscando recursos del catálogo…"})}
            full = ""
            is_counselor = False
            async for event in stream_with_fallback(messages, chat_type="digital_twin", user_id=user["id"]):
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

            if is_counselor or not full.strip() or full.strip() == FALLBACK_MESSAGE or full.strip().startswith(
                "Entiendo tu consulta. Configure las API keys"
            ):
                async for ev in _emit_handoff("El asistente IA no pudo responder; escalado a bienestar"):
                    yield ev
                return

            output_check = check_output(full, "digital_twin", user_id=user["id"], already_sanitized=True)
            if not output_check.allowed and output_check.user_message:
                full = output_check.user_message
            else:
                full = output_check.sanitized_text or full

            _save_assistant(full.strip())
            yield {"event": "done", "data": json.dumps({"content": full.strip(), "counselor": False})}
        except Exception as exc:
            logger.error("Chat stream error: %s", exc)
            async for ev in _emit_handoff(f"Error técnico en el chat: {exc}"):
                yield ev

    return EventSourceResponse(event_generator())


@router.post("/paths")
async def create_path(body: PathCreate, user: dict = Depends(require_student)):
    raise HTTPException(status_code=410, detail="Rutas de aprendizaje deshabilitadas: foco en prevención de deserción")


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
    """Catálogo local de recursos (sin scraper externo)."""
    sb = get_supabase()
    q = (body.q or "").strip()
    query = sb.table("resources").select(
        "id, title, description, topic, url, resource_type, category"
    )
    if user.get("institution_id"):
        query = query.eq("institution_id", user["institution_id"])
    rows = query.limit(50).execute().data or []
    if not q:
        return rows[:10]
    needle = q.lower()
    filtered = [
        r for r in rows
        if needle in (r.get("title") or "").lower()
        or needle in (r.get("topic") or "").lower()
        or needle in (r.get("description") or "").lower()
    ]
    return filtered[:15]


@router.get("/self-help")
async def self_help_resources(user: dict = Depends(require_student), topic: str = Query("bienestar")):
    sb = get_supabase()
    query = sb.table("resources").select(
        "id, title, description, topic, url, resource_type, category"
    ).eq("category", "wellbeing")
    if user.get("institution_id"):
        query = query.eq("institution_id", user["institution_id"])
    rows = query.limit(20).execute().data or []
    if rows:
        return rows
    # fallback any resources matching topic text
    all_rows = sb.table("resources").select(
        "id, title, description, topic, url, resource_type, category"
    )
    if user.get("institution_id"):
        all_rows = all_rows.eq("institution_id", user["institution_id"])
    data = all_rows.limit(50).execute().data or []
    needle = (topic or "bienestar").lower()
    return [
        r for r in data
        if needle in (r.get("title") or "").lower() or needle in (r.get("topic") or "").lower()
    ][:10]


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
    if body.chat_id:
        chat = (
            sb.table("chats")
            .select("id, handoff_mode")
            .eq("id", body.chat_id)
            .eq("user_id", user["id"])
            .single()
            .execute()
        )
        if not chat.data:
            raise HTTPException(status_code=404, detail="Chat not found")
        if chat.data.get("handoff_mode") != "human":
            escalate_chat_to_human(
                sb,
                body.chat_id,
                user["id"],
                body.reason or "Solicitud de apoyo psicológico",
            )
        existing = (
            sb.table("support_requests")
            .select("*")
            .eq("chat_id", body.chat_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        row = existing.data[0] if existing.data else {}
    else:
        result = sb.table("support_requests").insert({
            "user_id": user["id"],
            "chat_id": body.chat_id,
            "reason": body.reason,
        }).execute()
        row = result.data[0] if result.data else {}

    inst = user.get("institution_id")
    if inst:
        try:
            enqueue_risk_recompute(user["id"], inst, triggered_by="student_action")
        except Exception:
            pass
    return row


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
            enqueue_risk_recompute(user["id"], inst, triggered_by="student_action")
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
