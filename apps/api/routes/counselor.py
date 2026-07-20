"""Inbox y respuestas del psicólogo en chats con handoff humano."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.supabase_client import get_supabase
from routes.deps import require_counselor, effective_institution_id
from services.chat_handoff import counselor_public_profile

router = APIRouter(prefix="/institutional/counselor", tags=["counselor"])


class CounselorMessageCreate(BaseModel):
    content: str


class CounselorChatPatch(BaseModel):
    status: str = "resolved"


def _counselor_institution(user: dict) -> str:
    inst = effective_institution_id(user)
    if not inst:
        raise HTTPException(status_code=400, detail="Institución requerida")
    return inst


def _assert_human_chat(sb, chat_id: str, institution_id: str) -> dict:
    chat = sb.table("chats").select("*").eq("id", chat_id).single().execute()
    if not chat.data:
        raise HTTPException(status_code=404, detail="Chat no encontrado")
    if chat.data.get("handoff_mode") != "human":
        raise HTTPException(status_code=400, detail="Este chat no está en modo humano")

    student = (
        sb.table("users")
        .select("id, full_name, email, institution_id")
        .eq("id", chat.data["user_id"])
        .single()
        .execute()
    )
    if not student.data or student.data.get("institution_id") != institution_id:
        raise HTTPException(status_code=403, detail="Chat fuera de su institución")
    return {**chat.data, "student": student.data}


@router.get("/inbox")
async def counselor_inbox(user: dict = Depends(require_counselor)):
    sb = get_supabase()
    institution_id = _counselor_institution(user)

    students = (
        sb.table("users")
        .select("id, full_name, email")
        .eq("institution_id", institution_id)
        .eq("role", "student")
        .execute()
    )
    student_map = {s["id"]: s for s in (students.data or [])}
    if not student_map:
        return []

    chats = (
        sb.table("chats")
        .select("*")
        .eq("handoff_mode", "human")
        .in_("user_id", list(student_map.keys()))
        .order("updated_at", desc=True)
        .limit(100)
        .execute()
    )

    rows = []
    for chat in chats.data or []:
        st = student_map.get(chat["user_id"], {})
        msgs = (
            sb.table("messages")
            .select("role, content, created_at")
            .eq("chat_id", chat["id"])
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        last = (msgs.data or [{}])[0]
        unread = last.get("role") == "user"
        rows.append({
            **chat,
            "student_name": st.get("full_name") or st.get("email"),
            "student_email": st.get("email"),
            "last_message": last.get("content"),
            "last_message_at": last.get("created_at"),
            "needs_reply": unread,
        })
    return rows


@router.get("/chats/{chat_id}/messages")
async def counselor_get_messages(chat_id: str, user: dict = Depends(require_counselor)):
    sb = get_supabase()
    institution_id = _counselor_institution(user)
    chat = _assert_human_chat(sb, chat_id, institution_id)

    result = (
        sb.table("messages")
        .select("id, role, content, created_at, author_id")
        .eq("chat_id", chat_id)
        .order("created_at")
        .execute()
    )
    author_ids = {m["author_id"] for m in (result.data or []) if m.get("author_id")}
    authors: dict[str, dict] = {}
    if author_ids:
        users = sb.table("users").select("id, full_name, email").in_("id", list(author_ids)).execute()
        authors = {u["id"]: u for u in (users.data or [])}

    messages = []
    for m in result.data or []:
        row = dict(m)
        aid = row.pop("author_id", None)
        if aid and aid in authors:
            row["author"] = authors[aid]
        messages.append(row)

    return {
        "chat": {
            "id": chat["id"],
            "title": chat.get("title"),
            "handoff_mode": chat.get("handoff_mode"),
            "handoff_at": chat.get("handoff_at"),
        },
        "student": chat["student"],
        "messages": messages,
    }


@router.post("/chats/{chat_id}/messages")
async def counselor_send_message(
    chat_id: str,
    body: CounselorMessageCreate,
    user: dict = Depends(require_counselor),
):
    content = (body.content or "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Mensaje vacío")

    sb = get_supabase()
    institution_id = _counselor_institution(user)
    _assert_human_chat(sb, chat_id, institution_id)

    now = datetime.now(timezone.utc).isoformat()
    result = sb.table("messages").insert({
        "chat_id": chat_id,
        "role": "counselor",
        "content": content,
        "author_id": user["id"],
    }).execute()
    sb.table("chats").update({"updated_at": now}).eq("id", chat_id).execute()

    msg = result.data[0] if result.data else {"content": content, "role": "counselor"}
    msg["author"] = counselor_public_profile(user)
    return msg


@router.patch("/chats/{chat_id}")
async def counselor_resolve_chat(
    chat_id: str,
    body: CounselorChatPatch,
    user: dict = Depends(require_counselor),
):
    if body.status != "resolved":
        raise HTTPException(status_code=400, detail="Solo se admite status=resolved")

    sb = get_supabase()
    institution_id = _counselor_institution(user)
    chat = _assert_human_chat(sb, chat_id, institution_id)

    now = datetime.now(timezone.utc).isoformat()
    sb.table("chats").update({
        "handoff_mode": "resolved",
        "updated_at": now,
    }).eq("id", chat_id).execute()

    sr = (
        sb.table("support_requests")
        .select("id")
        .eq("chat_id", chat_id)
        .in_("status", ["pending", "assigned"])
        .limit(1)
        .execute()
    )
    if sr.data:
        sb.table("support_requests").update({"status": "resolved"}).eq("id", sr.data[0]["id"]).execute()

    inst = chat["student"].get("institution_id") or institution_id
    if inst:
        try:
            from services.risk_queue import enqueue_risk_recompute
            enqueue_risk_recompute(chat["user_id"], inst, triggered_by="counselor_resolve")
        except Exception:
            pass

    return {"handoff_mode": "resolved", "chat_id": chat_id}
