"""Opportunities API routes."""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from core.supabase_client import get_supabase
from routes.deps import require_student, require_admin, effective_institution_id
from services.recommendation_service import recommend_opportunities

router = APIRouter(prefix="/opportunities", tags=["opportunities"])
admin_router = APIRouter(prefix="/opportunities/admin", tags=["opportunities-admin"])


class OpportunityCreate(BaseModel):
    type: str
    title: str
    description: str | None = None
    requirements: list[str] = []
    area: str | None = None
    tags: list[str] = []
    deadline: str | None = None
    external_url: str | None = None


@router.get("")
async def list_opportunities(
    user: dict = Depends(require_student),
    type: str | None = Query(None),
    area: str | None = Query(None),
    deadline_before: str | None = Query(None),
):
    sb = get_supabase()
    inst = user.get("institution_id")
    if not inst:
        return []
    query = sb.table("opportunities").select("*").eq("institution_id", inst).eq("is_active", True)
    if type:
        query = query.eq("type", type)
    if area:
        query = query.eq("area", area)
    if deadline_before:
        query = query.lte("deadline", deadline_before)
    result = query.order("deadline").execute()
    return result.data or []


@router.get("/recommended")
async def recommended(user: dict = Depends(require_student)):
    inst = user.get("institution_id")
    if not inst:
        return []
    return recommend_opportunities(user["id"], inst)


@router.get("/{opp_id}")
async def get_opportunity(opp_id: str, user: dict = Depends(require_student)):
    sb = get_supabase()
    result = sb.table("opportunities").select("*").eq("id", opp_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404)
    inst = user.get("institution_id")
    if inst and result.data.get("institution_id") != inst:
        raise HTTPException(status_code=403)
    saved = sb.table("saved_opportunities").select("status").eq(
        "user_id", user["id"]
    ).eq("opportunity_id", opp_id).limit(1).execute()
    return {**result.data, "saved_status": saved.data[0]["status"] if saved.data else None}


def _assert_opportunity_in_institution(sb, opp_id: str, user: dict) -> None:
    opp = sb.table("opportunities").select("id, institution_id").eq("id", opp_id).single().execute()
    if not opp.data:
        raise HTTPException(status_code=404)
    if opp.data.get("institution_id") != user.get("institution_id"):
        raise HTTPException(status_code=403)


@router.post("/{opp_id}/save")
async def save_opportunity(opp_id: str, user: dict = Depends(require_student)):
    sb = get_supabase()
    _assert_opportunity_in_institution(sb, opp_id, user)
    sb.table("saved_opportunities").upsert({
        "user_id": user["id"],
        "opportunity_id": opp_id,
        "status": "saved",
    }, on_conflict="user_id,opportunity_id").execute()
    return {"saved": True}


@router.post("/{opp_id}/apply")
async def apply_opportunity(opp_id: str, user: dict = Depends(require_student)):
    sb = get_supabase()
    _assert_opportunity_in_institution(sb, opp_id, user)
    sb.table("saved_opportunities").upsert({
        "user_id": user["id"],
        "opportunity_id": opp_id,
        "status": "applied",
    }, on_conflict="user_id,opportunity_id").execute()
    return {"applied": True, "message": "Solicitud registrada (simulada). Recibirás confirmación por correo."}


@router.delete("/{opp_id}/save")
async def unsave_opportunity(opp_id: str, user: dict = Depends(require_student)):
    sb = get_supabase()
    sb.table("saved_opportunities").delete().eq("user_id", user["id"]).eq("opportunity_id", opp_id).execute()
    return {"saved": False}


@admin_router.get("/list")
async def admin_list(
    user: dict = Depends(require_admin),
    institution_id: str | None = Query(None),
):
    sb = get_supabase()
    inst = effective_institution_id(user, institution_id)
    if not inst:
        return []
    result = sb.table("opportunities").select("*").eq("institution_id", inst).order("created_at", desc=True).execute()
    return result.data or []


@admin_router.post("")
async def admin_create(
    body: OpportunityCreate,
    user: dict = Depends(require_admin),
    institution_id: str | None = Query(None),
):
    sb = get_supabase()
    inst = effective_institution_id(user, institution_id)
    if not inst:
        raise HTTPException(status_code=400, detail="Institución requerida")
    result = sb.table("opportunities").insert({
        **body.model_dump(),
        "institution_id": inst,
    }).execute()
    return result.data[0]


@admin_router.delete("/{opp_id}")
async def admin_delete(
    opp_id: str,
    user: dict = Depends(require_admin),
    institution_id: str | None = Query(None),
):
    sb = get_supabase()
    opp = sb.table("opportunities").select("id, institution_id").eq("id", opp_id).single().execute()
    if not opp.data:
        raise HTTPException(status_code=404)
    inst = effective_institution_id(user, institution_id)
    if inst and opp.data.get("institution_id") != inst:
        raise HTTPException(status_code=403, detail="Oportunidad fuera de su institución")
    sb.table("opportunities").update({"is_active": False}).eq("id", opp_id).execute()
    return {"deleted": True}
