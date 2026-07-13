"""Institutional routes."""
import logging
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr
from core.supabase_client import get_supabase
from core.parallel import run_parallel
from core.username import is_utb_email
from core.email_notify import notify_account_approved
from routes.deps import require_institutional, effective_institution_id, is_platform_admin
from agents.director_agent import get_director_insights
from agents.institutional_chat_agent import institutional_chat_reply, parse_chart_from_response
from core.tasks import get_job, run_in_background
from services.analytics_service import compute_dashboard, invalidate_dashboard
from services.risk_service import (
    get_latest_risk_by_institution,
    persist_risk_reports,
    compute_student_risk,
    persist_single_risk_report,
    get_risk_history,
    prune_risk_history,
)
from services.recommendation_service import recommend_opportunities

router = APIRouter(prefix="/institutional", tags=["institutional"])
logger = logging.getLogger(__name__)

CREATABLE_ROLES = frozenset({"student", "area_head", "dean", "vice_president", "rector", "admin"})


class InterventionCreate(BaseModel):
    student_id: str
    type: str = "academica"
    notes: str


class InterventionPatch(BaseModel):
    status: str | None = None
    notes: str | None = None


class SupportRequestPatch(BaseModel):
    status: str
    assigned_to: str | None = None


class AcademicOutcomeUpsert(BaseModel):
    user_id: str
    enrollment_status: str
    withdrawal_reason: str | None = None
    effective_date: str | None = None
    notes: str | None = None


class InstitutionUserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "student"
    program: str | None = None
    semester: int | None = None
    birth_date: str | None = None  # YYYY-MM-DD


class InstitutionalChatMessage(BaseModel):
    message: str
    history: list[dict] = []


def _compute_age(birth_date_str: str | None) -> int | None:
    if not birth_date_str:
        return None
    try:
        born = date.fromisoformat(str(birth_date_str)[:10])
    except ValueError:
        return None
    today = date.today()
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))


def _fetch_institution_users(inst: str) -> list[dict]:
    """Listado de usuarios con perfil y último riesgo (RPC con fallback manual)."""
    sb = get_supabase()
    try:
        result = sb.rpc("institution_users_with_profile", {"p_institution_id": inst}).execute()
        if result.data is not None:
            return result.data
    except Exception as exc:
        logger.warning("institution_users_with_profile RPC failed, using fallback: %s", exc)

    users_res = sb.table("users").select(
        "id, email, full_name, role, status, created_at"
    ).eq("institution_id", inst).neq("role", "platform_admin").order(
        "created_at", desc=True
    ).execute()
    users = users_res.data or []
    if not users:
        return []

    ids = [u["id"] for u in users]
    profiles_res = sb.table("student_profiles").select(
        "user_id, program, semester, birth_date"
    ).in_("user_id", ids).execute()
    profiles = {p["user_id"]: p for p in (profiles_res.data or [])}

    rows: list[dict] = []
    for u in users:
        prof = profiles.get(u["id"], {})
        rows.append({
            "user_id": u["id"],
            "email": u["email"],
            "full_name": u.get("full_name") or u["email"],
            "role": u["role"],
            "status": u["status"],
            "created_at": u.get("created_at"),
            "program": prof.get("program"),
            "semester": prof.get("semester"),
            "birth_date": prof.get("birth_date"),
            "age": _compute_age(prof.get("birth_date")),
            "risk_level": None,
            "risk_score": None,
        })
    return rows


@router.get("/users")
async def list_institution_users(
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
    name: str | None = Query(None, description="Filtro por nombre o email"),
    program: str | None = Query(None, description="Filtro por programa académico"),
    role: str | None = Query(None),
    age_min: int | None = Query(None, ge=0),
    age_max: int | None = Query(None, ge=0),
):
    inst = effective_institution_id(user, institution_id)
    if not inst:
        raise HTTPException(status_code=400, detail="Institución requerida")

    rows = _fetch_institution_users(inst)

    if name:
        needle = name.strip().lower()
        rows = [
            r for r in rows
            if needle in (r.get("full_name") or "").lower() or needle in (r.get("email") or "").lower()
        ]
    if program:
        needle = program.strip().lower()
        rows = [r for r in rows if needle in (r.get("program") or "").lower()]
    if role:
        rows = [r for r in rows if r.get("role") == role]
    if age_min is not None:
        rows = [r for r in rows if r.get("age") is not None and r["age"] >= age_min]
    if age_max is not None:
        rows = [r for r in rows if r.get("age") is not None and r["age"] <= age_max]

    programs = sorted({r["program"] for r in rows if r.get("program")})
    return {"users": rows, "programs": programs, "total": len(rows)}


@router.post("/users", status_code=201)
async def create_institution_user(
    body: InstitutionUserCreate,
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    inst = effective_institution_id(user, institution_id)
    if not inst:
        raise HTTPException(status_code=400, detail="Institución requerida")
    if body.role not in CREATABLE_ROLES:
        raise HTTPException(status_code=400, detail="Rol inválido")
    if not is_utb_email(body.email):
        raise HTTPException(status_code=400, detail="El correo debe ser institucional (@utb.edu.co)")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres")
    if body.birth_date:
        try:
            date.fromisoformat(body.birth_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Fecha de nacimiento inválida (usa YYYY-MM-DD)")

    sb = get_supabase()
    try:
        auth_resp = sb.auth.admin.create_user({
            "email": body.email,
            "password": body.password,
            "email_confirm": True,
            "user_metadata": {"full_name": body.full_name},
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No se pudo crear el usuario: {e}")

    new_user = auth_resp.user
    if not new_user:
        raise HTTPException(status_code=500, detail="Error al crear el usuario en Auth")

    sb.table("users").upsert({
        "id": new_user.id,
        "email": body.email,
        "full_name": body.full_name,
        "role": body.role,
        "status": "approved",
        "institution_id": inst,
    }, on_conflict="id").execute()

    if body.role == "student":
        profile: dict = {"user_id": new_user.id}
        if body.program:
            profile["program"] = body.program
        if body.semester is not None:
            profile["semester"] = body.semester
        if body.birth_date:
            profile["birth_date"] = body.birth_date
        sb.table("student_profiles").upsert(profile, on_conflict="user_id").execute()

    # Marcar la solicitud generada por el trigger como aprobada para consistencia
    sb.table("registration_requests").upsert({
        "user_id": new_user.id,
        "institution_id": inst,
        "requested_role": body.role,
        "status": "approved",
        "reviewed_by": user["id"],
        "reviewed_at": datetime.utcnow().isoformat() + "Z",
    }, on_conflict="user_id").execute()

    try:
        await notify_account_approved(body.email, body.full_name, body.role)
    except Exception as exc:
        logger.warning("No se pudo enviar email de bienvenida: %s", exc)

    return {"id": new_user.id, "email": body.email, "role": body.role, "status": "approved"}


@router.get("/dashboard")
async def get_dashboard(
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    inst = effective_institution_id(user, institution_id)
    return compute_dashboard({**user, "institution_id": inst})


@router.get("/analytics/dashboard")
async def get_analytics_dashboard(
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    inst = effective_institution_id(user, institution_id)
    return compute_dashboard({**user, "institution_id": inst})


@router.get("/kpis")
async def get_kpis(
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    inst = effective_institution_id(user, institution_id)
    dashboard = compute_dashboard({**user, "institution_id": inst})
    return dashboard["kpis"]


@router.get("/actions")
async def get_actions(
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    inst = effective_institution_id(user, institution_id)
    return compute_dashboard({**user, "institution_id": inst})["actions"]


@router.get("/prediction")
async def get_prediction(
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    inst = effective_institution_id(user, institution_id)
    return compute_dashboard({**user, "institution_id": inst})["prediction"]


@router.get("/risk/students")
async def get_risk_students(
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
    risk_level: str | None = Query(None),
    program: str | None = Query(None),
    search: str | None = Query(None),
    min_score: float | None = Query(None),
    dominant_cause: str | None = Query(None),
):
    inst = effective_institution_id(user, institution_id)
    if not inst:
        return []
    return get_latest_risk_by_institution(
        inst,
        risk_level=risk_level,
        program=program,
        search=search,
        min_score=min_score,
        dominant_cause=dominant_cause,
    )


@router.post("/risk/compute")
async def compute_risk(
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
    async_mode: bool = Query(True, description="Encolar cálculo en background"),
):
    inst = effective_institution_id(user, institution_id)
    if not inst:
        raise HTTPException(status_code=400, detail="Institución requerida")

    if not async_mode:
        count = persist_risk_reports(inst)
        invalidate_dashboard(inst)
        return {"computed": count, "status": "completed"}

    job_id = await run_in_background(persist_risk_reports, inst)
    return {"job_id": job_id, "status": "queued"}


@router.get("/risk/compute/{job_id}")
async def get_risk_compute_status(
    job_id: str,
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    job = await get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Trabajo no encontrado")
    if job.get("status") == "completed":
        inst = effective_institution_id(user, institution_id)
        if inst:
            invalidate_dashboard(inst)
    return job


@router.get("/students/{student_id}")
async def get_student_detail(
    student_id: str,
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    sb = get_supabase()
    inst = effective_institution_id(user, institution_id)
    student = sb.table("users").select("id, full_name, email, created_at, institution_id").eq(
        "id", student_id
    ).eq("role", "student").single().execute()
    if not student.data:
        raise HTTPException(status_code=404)

    if not is_platform_admin(user) and not inst:
        raise HTTPException(status_code=403, detail="Institución requerida")
    if inst and student.data.get("institution_id") != inst:
        raise HTTPException(status_code=403)

    def fetch_profile():
        return sb.table("student_profiles").select("*").eq("user_id", student_id).limit(1).execute()

    def fetch_risk():
        return sb.table("student_risk_reports").select("*").eq(
            "user_id", student_id
        ).order("computed_at", desc=True).limit(1).execute()

    def fetch_interventions():
        return sb.table("interventions").select("*").eq(
            "student_id", student_id
        ).order("created_at", desc=True).execute()

    def fetch_chats():
        return sb.table("chats").select("id, title, updated_at").eq(
            "user_id", student_id
        ).order("updated_at", desc=True).limit(10).execute()

    def fetch_support():
        return sb.table("support_requests").select("*").eq(
            "user_id", student_id
        ).order("created_at", desc=True).execute()

    profile, risk, interventions, chats, support = run_parallel(
        fetch_profile, fetch_risk, fetch_interventions, fetch_chats, fetch_support
    )

    risk_institution = inst or student.data.get("institution_id") or ""
    risk_computed = risk.data[0] if risk.data else compute_student_risk(student_id, risk_institution)
    risk_history = get_risk_history(student_id, limit=8)

    economic_factors = {"situacion_economica", "economico"}
    dominant = risk_computed.get("dominant_cause")
    factor_keys = {f.get("key") for f in (risk_computed.get("factors") or [])}
    recommended_opportunities = []
    if dominant == "economico" or economic_factors & factor_keys:
        try:
            recommended_opportunities = recommend_opportunities(
                student_id, risk_institution, limit=5
            )
        except Exception:
            recommended_opportunities = []

    prof = profile.data[0] if profile.data else {}
    twin = None
    if prof.get("twin_consent"):
        twin_result = sb.table("digital_twin_profiles").select(
            "interests, learning_style, summary_text, traits, generated_at"
        ).eq("user_id", student_id).limit(1).execute()
        twin = twin_result.data[0] if twin_result.data else None

    return {
        "student": student.data,
        "profile": prof,
        "risk": risk_computed,
        "risk_history": risk_history,
        "interventions": interventions.data or [],
        "support_requests": support.data or [],
        "activity": chats.data or [],
        "digital_twin": twin,
        "recommended_opportunities": recommended_opportunities,
    }


@router.post("/interventions")
async def create_intervention(
    body: InterventionCreate,
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    sb = get_supabase()
    inst = effective_institution_id(user, institution_id)
    if not inst:
        raise HTTPException(status_code=400, detail="Institución requerida")
    student = sb.table("users").select("id, institution_id").eq(
        "id", body.student_id
    ).eq("role", "student").single().execute()
    if not student.data:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    if student.data.get("institution_id") != inst:
        raise HTTPException(status_code=403, detail="Estudiante fuera de su institución")
    result = sb.table("interventions").insert({
        "student_id": body.student_id,
        "staff_id": user["id"],
        "institution_id": inst,
        "type": body.type,
        "notes": body.notes,
    }).execute()
    return result.data[0]


@router.patch("/interventions/{intervention_id}")
async def patch_intervention(
    intervention_id: str,
    body: InterventionPatch,
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    sb = get_supabase()
    inst = effective_institution_id(user, institution_id)
    if not inst:
        raise HTTPException(status_code=400, detail="Institución requerida")
    existing = sb.table("interventions").select("*").eq("id", intervention_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Intervención no encontrada")
    if existing.data.get("institution_id") != inst:
        raise HTTPException(status_code=403)
    updates: dict = {}
    if body.status is not None:
        if body.status not in ("open", "closed"):
            raise HTTPException(status_code=400, detail="Estado inválido")
        updates["status"] = body.status
    if body.notes is not None:
        updates["notes"] = body.notes
    if not updates:
        return existing.data
    result = sb.table("interventions").update(updates).eq("id", intervention_id).execute()
    return result.data[0] if result.data else existing.data


@router.get("/support-requests")
async def list_support_requests(
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
    status: str | None = Query(None),
    search: str | None = Query(None),
):
    sb = get_supabase()
    inst = effective_institution_id(user, institution_id)
    if not inst:
        raise HTTPException(status_code=400, detail="Institución requerida")

    students = sb.table("users").select("id, full_name, email").eq(
        "institution_id", inst
    ).eq("role", "student").execute()
    student_map = {s["id"]: s for s in (students.data or [])}
    if not student_map:
        return []

    query = sb.table("support_requests").select("*").in_("user_id", list(student_map.keys()))
    if status:
        query = query.eq("status", status)
    result = query.order("created_at", desc=True).limit(100).execute()

    rows = []
    for r in result.data or []:
        st = student_map.get(r["user_id"], {})
        row = {**r, "student_name": st.get("full_name") or st.get("email"), "student_email": st.get("email")}
        if search:
            needle = search.strip().lower()
            if needle not in (row.get("student_name") or "").lower() and needle not in (row.get("reason") or "").lower():
                continue
        rows.append(row)
    return rows


@router.patch("/support-requests/{request_id}")
async def patch_support_request(
    request_id: str,
    body: SupportRequestPatch,
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    sb = get_supabase()
    inst = effective_institution_id(user, institution_id)
    if not inst:
        raise HTTPException(status_code=400, detail="Institución requerida")
    if body.status not in ("pending", "assigned", "resolved"):
        raise HTTPException(status_code=400, detail="Estado inválido")

    existing = sb.table("support_requests").select("*").eq("id", request_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    student = sb.table("users").select("institution_id").eq(
        "id", existing.data["user_id"]
    ).single().execute()
    if not student.data or student.data.get("institution_id") != inst:
        raise HTTPException(status_code=403)

    updates: dict = {"status": body.status}
    if body.status == "assigned" and body.assigned_to:
        updates["assigned_to"] = body.assigned_to
    elif body.status == "assigned":
        updates["assigned_to"] = user["id"]

    result = sb.table("support_requests").update(updates).eq("id", request_id).execute()

    if body.status in ("assigned", "resolved"):
        student_id = existing.data.get("user_id")
        if student_id:
            try:
                persist_single_risk_report(student_id, inst)
            except Exception:
                pass

    return result.data[0] if result.data else existing.data


@router.get("/students/{student_id}/risk-history")
async def student_risk_history(
    student_id: str,
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
    limit: int = Query(10, ge=1, le=50),
):
    inst = effective_institution_id(user, institution_id)
    sb = get_supabase()
    student = sb.table("users").select("institution_id").eq("id", student_id).eq("role", "student").single().execute()
    if not student.data:
        raise HTTPException(status_code=404)
    if inst and student.data.get("institution_id") != inst:
        raise HTTPException(status_code=403)
    return get_risk_history(student_id, limit=limit)


@router.get("/academic-outcomes")
async def list_academic_outcomes(
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
    status: str | None = Query(None),
):
    sb = get_supabase()
    inst = effective_institution_id(user, institution_id)
    if not inst:
        raise HTTPException(status_code=400, detail="Institución requerida")
    query = sb.table("student_academic_outcomes").select("*").eq("institution_id", inst)
    if status:
        query = query.eq("enrollment_status", status)
    result = query.order("updated_at", desc=True).execute()
    rows = result.data or []
    if not rows:
        return []
    user_ids = [r["user_id"] for r in rows]
    users_res = sb.table("users").select("id, full_name, email").in_("id", user_ids).execute()
    user_map = {u["id"]: u for u in (users_res.data or [])}
    for r in rows:
        r["users"] = user_map.get(r["user_id"])
    return rows


@router.post("/academic-outcomes", status_code=201)
async def upsert_academic_outcome(
    body: AcademicOutcomeUpsert,
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    sb = get_supabase()
    inst = effective_institution_id(user, institution_id)
    if not inst:
        raise HTTPException(status_code=400, detail="Institución requerida")
    if body.enrollment_status not in ("activo", "aplazado", "retirado", "graduado"):
        raise HTTPException(status_code=400, detail="Estado inválido")

    student = sb.table("users").select("id, institution_id").eq(
        "id", body.user_id
    ).eq("role", "student").single().execute()
    if not student.data or student.data.get("institution_id") != inst:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    row = {
        "user_id": body.user_id,
        "institution_id": inst,
        "enrollment_status": body.enrollment_status,
        "withdrawal_reason": body.withdrawal_reason,
        "effective_date": body.effective_date,
        "notes": body.notes,
        "recorded_by": user["id"],
        "updated_at": datetime.utcnow().isoformat() + "Z",
    }
    result = sb.table("student_academic_outcomes").upsert(row, on_conflict="user_id").execute()
    return result.data[0] if result.data else row


@router.post("/director/chat")
async def director_chat(
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    inst = effective_institution_id(user, institution_id)
    dashboard = compute_dashboard({**user, "institution_id": inst})
    kpis = dashboard["kpis"]
    try:
        insights = await get_director_insights(kpis)
    except Exception as exc:
        logger.error("Director insights failed: %s", exc)
        insights = "Lo siento, el servidor no funciona"
    return {"insights": insights}


@router.post("/chat")
async def institutional_chat(
    body: InstitutionalChatMessage,
    user: dict = Depends(require_institutional),
    institution_id: str | None = Query(None),
):
    inst = effective_institution_id(user, institution_id)
    dashboard = compute_dashboard({**user, "institution_id": inst})
    kpis = dashboard.get("kpis") or []
    charts = dashboard.get("charts") or {}
    try:
        raw = await institutional_chat_reply(body.message, body.history, kpis, charts)
        text, chart = parse_chart_from_response(raw)
    except Exception as exc:
        logger.error("Institutional chat failed: %s", exc)
        raise HTTPException(status_code=503, detail="No se pudo generar la respuesta") from exc
    return {"text": text, "chart": chart}
