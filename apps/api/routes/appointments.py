"""Psychology appointment scheduling: student proposes, counselor confirms."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core.email_notify import (
    notify_appointment_confirmed,
    notify_appointment_rejected,
    notify_appointment_requested,
)
from core.supabase_client import get_supabase
from routes.deps import require_counselor, require_student
from services.chat_handoff import get_counselor_user, psychologist_email

router = APIRouter(tags=["appointments"])


class AppointmentCreate(BaseModel):
    proposed_at: str
    reason: str | None = None
    duration_minutes: int = Field(default=45, ge=15, le=120)
    chat_id: str | None = None


class AppointmentDecision(BaseModel):
    counselor_note: str | None = None


def _parse_proposed_at(value: str) -> datetime:
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Fecha/hora inválida") from exc
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    if dt < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="La fecha propuesta debe ser futura")
    return dt


def _fmt_dt(iso: str | None) -> str:
    if not iso:
        return "por definir"
    try:
        dt = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
        return dt.strftime("%d/%m/%Y %H:%M")
    except Exception:
        return str(iso)


@router.post("/appointments")
async def create_appointment(body: AppointmentCreate, user: dict = Depends(require_student)):
    inst = user.get("institution_id")
    if not inst:
        raise HTTPException(status_code=400, detail="Perfil sin institución UTB asignada")

    proposed = _parse_proposed_at(body.proposed_at)
    sb = get_supabase()
    counselor = get_counselor_user(sb)
    now = datetime.now(timezone.utc).isoformat()

    row = {
        "student_id": user["id"],
        "counselor_id": counselor.get("id"),
        "institution_id": inst,
        "chat_id": body.chat_id,
        "proposed_at": proposed.isoformat(),
        "duration_minutes": body.duration_minutes,
        "reason": (body.reason or "").strip()[:500] or None,
        "status": "pending",
        "created_at": now,
        "updated_at": now,
    }
    result = sb.table("psychology_appointments").insert(row).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="No se pudo crear la cita")
    appt = result.data[0]

    student_name = user.get("full_name") or user.get("email") or "Estudiante"
    student_email = user.get("email") or ""
    when = _fmt_dt(appt.get("proposed_at"))
    counselor_email = counselor.get("email") or psychologist_email()

    await notify_appointment_requested(
        counselor_email=counselor_email,
        student_name=student_name,
        student_email=student_email,
        proposed_at=when,
        reason=appt.get("reason"),
    )
    if student_email:
        await notify_appointment_requested(
            counselor_email=student_email,
            student_name=student_name,
            student_email=student_email,
            proposed_at=when,
            reason=appt.get("reason"),
            for_student=True,
        )

    return appt


@router.get("/appointments/mine")
async def my_appointments(user: dict = Depends(require_student)):
    sb = get_supabase()
    result = (
        sb.table("psychology_appointments")
        .select("*")
        .eq("student_id", user["id"])
        .order("proposed_at", desc=True)
        .limit(30)
        .execute()
    )
    return result.data or []


@router.post("/appointments/{appointment_id}/cancel")
async def cancel_appointment(appointment_id: str, user: dict = Depends(require_student)):
    sb = get_supabase()
    existing = (
        sb.table("psychology_appointments")
        .select("*")
        .eq("id", appointment_id)
        .eq("student_id", user["id"])
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    appt = existing.data[0]
    if appt.get("status") not in ("pending", "confirmed"):
        raise HTTPException(status_code=400, detail="Esta cita ya no se puede cancelar")
    now = datetime.now(timezone.utc).isoformat()
    updated = (
        sb.table("psychology_appointments")
        .update({"status": "cancelled", "updated_at": now})
        .eq("id", appointment_id)
        .execute()
    )
    return updated.data[0] if updated.data else {"id": appointment_id, "status": "cancelled"}


@router.get("/appointments/inbox")
async def counselor_appointments_inbox(user: dict = Depends(require_counselor)):
    sb = get_supabase()
    inst = user.get("institution_id")
    q = sb.table("psychology_appointments").select("*").order("proposed_at", desc=False).limit(100)
    if inst:
        q = q.eq("institution_id", inst)
    rows = q.execute().data or []

    student_ids = list({r["student_id"] for r in rows if r.get("student_id")})
    students_by_id: dict = {}
    if student_ids:
        students = (
            sb.table("users")
            .select("id, full_name, email")
            .in_("id", student_ids)
            .execute()
        )
        students_by_id = {s["id"]: s for s in (students.data or [])}

    enriched = []
    for r in rows:
        s = students_by_id.get(r.get("student_id"), {})
        enriched.append({
            **r,
            "student_name": s.get("full_name"),
            "student_email": s.get("email"),
        })
    return enriched


@router.post("/appointments/{appointment_id}/confirm")
async def confirm_appointment(
    appointment_id: str,
    body: AppointmentDecision,
    user: dict = Depends(require_counselor),
):
    sb = get_supabase()
    existing = (
        sb.table("psychology_appointments")
        .select("*")
        .eq("id", appointment_id)
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    appt = existing.data[0]
    if appt.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Solo se confirman citas pendientes")

    now = datetime.now(timezone.utc).isoformat()
    update = {
        "status": "confirmed",
        "confirmed_at": now,
        "updated_at": now,
        "counselor_id": user["id"],
        "counselor_note": (body.counselor_note or "").strip()[:500] or None,
    }
    result = sb.table("psychology_appointments").update(update).eq("id", appointment_id).execute()
    confirmed = result.data[0] if result.data else {**appt, **update}

    student = (
        sb.table("users")
        .select("full_name, email")
        .eq("id", appt["student_id"])
        .limit(1)
        .execute()
    )
    student_row = student.data[0] if student.data else {}
    when = _fmt_dt(confirmed.get("proposed_at"))
    note = confirmed.get("counselor_note")

    if student_row.get("email"):
        await notify_appointment_confirmed(
            to_email=student_row["email"],
            student_name=student_row.get("full_name") or "Estudiante",
            proposed_at=when,
            counselor_note=note,
            role="student",
        )
    counselor_email = user.get("email") or psychologist_email()
    await notify_appointment_confirmed(
        to_email=counselor_email,
        student_name=student_row.get("full_name") or "Estudiante",
        proposed_at=when,
        counselor_note=note,
        role="counselor",
        student_email=student_row.get("email"),
    )
    return confirmed


@router.post("/appointments/{appointment_id}/reject")
async def reject_appointment(
    appointment_id: str,
    body: AppointmentDecision,
    user: dict = Depends(require_counselor),
):
    sb = get_supabase()
    existing = (
        sb.table("psychology_appointments")
        .select("*")
        .eq("id", appointment_id)
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    appt = existing.data[0]
    if appt.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Solo se rechazan citas pendientes")

    now = datetime.now(timezone.utc).isoformat()
    note = (body.counselor_note or "").strip()[:500] or None
    update = {
        "status": "rejected",
        "updated_at": now,
        "counselor_id": user["id"],
        "counselor_note": note,
    }
    result = sb.table("psychology_appointments").update(update).eq("id", appointment_id).execute()
    rejected = result.data[0] if result.data else {**appt, **update}

    student = (
        sb.table("users")
        .select("full_name, email")
        .eq("id", appt["student_id"])
        .limit(1)
        .execute()
    )
    student_row = student.data[0] if student.data else {}
    when = _fmt_dt(appt.get("proposed_at"))

    if student_row.get("email"):
        await notify_appointment_rejected(
            to_email=student_row["email"],
            student_name=student_row.get("full_name") or "Estudiante",
            proposed_at=when,
            counselor_note=note,
        )
    counselor_email = user.get("email") or psychologist_email()
    await notify_appointment_rejected(
        to_email=counselor_email,
        student_name=student_row.get("full_name") or "Estudiante",
        proposed_at=when,
        counselor_note=note,
        for_counselor=True,
        student_email=student_row.get("email"),
    )
    return rejected
