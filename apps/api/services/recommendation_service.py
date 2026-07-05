"""Opportunity recommendation based on Digital Twin profile."""
from datetime import date

from core.parallel import run_parallel
from core.supabase_client import get_supabase


def score_opportunity(opp: dict, twin: dict | None, profile: dict | None, psych_tags: list[str]) -> tuple[int, list[str]]:
    score = 0
    reasons: list[str] = []
    tags = set(opp.get("tags") or [])
    area = (opp.get("area") or "").lower()
    program = (profile or {}).get("program", "").lower()

    if twin:
        interests = [i.lower() for i in (twin.get("interests") or [])]
        for interest in interests:
            if any(interest in t for t in tags) or interest in area or interest in (opp.get("title") or "").lower():
                score += 25
                reasons.append(f"Alineado con tu interés: {interest}")

    if program and area and (area in program or program in area or area == "general"):
        score += 20
        reasons.append("Relacionado con tu programa académico")

    if psych_tags:
        for tag in psych_tags:
            if tag in tags or tag in area:
                score += 15
                reasons.append(f"Coincide con tu perfil psicométrico")

    deadline = opp.get("deadline")
    if deadline:
        try:
            d = date.fromisoformat(str(deadline)[:10])
            days = (d - date.today()).days
            if 0 < days <= 30:
                score += 10
                reasons.append("Fecha límite próxima")
        except ValueError:
            pass

    return min(100, score), reasons[:3]


def recommend_opportunities(user_id: str, institution_id: str, limit: int = 5) -> list[dict]:
    sb = get_supabase()

    def fetch_opps():
        return sb.table("opportunities").select("*").eq("institution_id", institution_id).eq(
            "is_active", True
        ).execute()

    def fetch_twin():
        return sb.table("digital_twin_profiles").select("*").eq("user_id", user_id).limit(1).execute()

    def fetch_profile():
        return sb.table("student_profiles").select("*").eq("user_id", user_id).limit(1).execute()

    def fetch_psych():
        return sb.table("psychometric_assessments").select("responses").eq("user_id", user_id).eq(
            "status", "completed"
        ).limit(1).execute()

    opps, twin, profile, psych = run_parallel(fetch_opps, fetch_twin, fetch_profile, fetch_psych)

    if not opps.data:
        return []

    twin_data = twin.data[0] if twin.data else None
    profile_data = profile.data[0] if profile.data else None

    psych_tags: list[str] = []
    if psych.data:
        for r in psych.data[0].get("responses") or []:
            if r.get("tags"):
                psych_tags.extend(r["tags"])

    scored = []
    for opp in opps.data:
        s, reasons = score_opportunity(opp, twin_data, profile_data, psych_tags)
        scored.append({**opp, "match_score": s, "match_reasons": reasons})

    scored.sort(key=lambda x: x["match_score"], reverse=True)
    return scored[:limit]
