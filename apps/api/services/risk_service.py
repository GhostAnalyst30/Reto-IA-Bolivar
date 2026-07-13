"""Student risk scoring and persistence."""
from datetime import datetime, timedelta, timezone

from core.cache import risk_cache
from core.parallel import run_parallel
from core.supabase_client import get_supabase
from services.psychometric_scoring import compute_dominant_cause, score_psychometric_responses

PROGRESS_RECOMPUTE_THRESHOLD = 10


def _invalidate_institution_caches(institution_id: str) -> None:
    risk_cache.invalidate(institution_id)
    try:
        from services.analytics_service import invalidate_dashboard
        invalidate_dashboard(institution_id)
    except Exception:
        pass


def _finalize_risk_report(report: dict) -> dict:
    factors = report.get("factors") or []
    report["dominant_cause"] = compute_dominant_cause(factors)
    report["risk_score"] = round(min(100.0, float(report.get("risk_score", 0))), 1)
    return report


def _score_risk_from_data(
    user_id: str,
    institution_id: str,
    chats_by_user: dict[str, list],
    psych_by_user: dict[str, str | None],
    psych_responses_by_user: dict[str, list],
    progress_by_user: dict[str, list[float]],
    moods_by_user: dict[str, list[float]],
    support_pending_by_user: dict[str, bool],
    week_ago: str,
) -> dict:
    factors: list[dict] = []
    score = 0.0

    recent = any(c.get("updated_at", "") >= week_ago for c in chats_by_user.get(user_id, []))
    if not recent:
        score += 35
        factors.append({"key": "inactivity", "label": "Sin actividad en Digital Twin (7 días)", "weight": 35})

    psych_status = psych_by_user.get(user_id)
    if psych_status != "completed":
        score += 25
        factors.append({"key": "survey", "label": "Encuesta psicométrica incompleta", "weight": 25})

    progress_vals = progress_by_user.get(user_id, [])
    if progress_vals:
        avg = sum(progress_vals) / len(progress_vals)
        if avg < 40:
            score += 20
            factors.append({"key": "progress", "label": f"Bajo progreso académico ({avg:.0f}%)", "weight": 20})
    else:
        score += 10
        factors.append({"key": "progress", "label": "Sin datos de progreso", "weight": 10})

    mood_vals = moods_by_user.get(user_id, [])
    if mood_vals:
        avg_mood = sum(mood_vals) / len(mood_vals)
        if avg_mood <= 2:
            score += 20
            factors.append({"key": "mood", "label": "Estado de ánimo bajo reportado", "weight": 20})

    psych_factors = score_psychometric_responses(psych_responses_by_user.get(user_id))
    for pf in psych_factors:
        score += pf["weight"]
        factors.append(pf)

    if support_pending_by_user.get(user_id):
        score += 20
        factors.append({
            "key": "solicitud_apoyo_activa",
            "label": "Solicitud de apoyo humano pendiente",
            "weight": 20,
        })

    if score >= 60:
        level = "alto"
    elif score >= 30:
        level = "moderado"
    else:
        level = "bajo"

    return _finalize_risk_report({
        "user_id": user_id,
        "institution_id": institution_id,
        "risk_level": level,
        "risk_score": score,
        "factors": factors,
    })


def _load_bulk_risk_data(sb, student_ids: list[str], week_ago: str) -> tuple:
    if not student_ids:
        return {}, {}, {}, {}, {}, {}

    support_cutoff = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()

    def fetch_chats():
        return sb.table("chats").select("user_id, updated_at").in_("user_id", student_ids).eq(
            "chat_type", "digital_twin"
        ).execute()

    def fetch_psych():
        return sb.table("psychometric_assessments").select(
            "user_id, status, responses"
        ).in_("user_id", student_ids).execute()

    def fetch_progress():
        return sb.table("student_progress").select("user_id, progress_percent").in_(
            "user_id", student_ids
        ).execute()

    def fetch_moods():
        return sb.table("mood_checkins").select("user_id, mood_score, created_at").in_(
            "user_id", student_ids
        ).order("created_at", desc=True).limit(len(student_ids) * 3).execute()

    def fetch_support():
        return sb.table("support_requests").select("user_id, status, created_at").in_(
            "user_id", student_ids
        ).eq("status", "pending").gte("created_at", support_cutoff).execute()

    chats_res, psych_res, progress_res, moods_res, support_res = run_parallel(
        fetch_chats, fetch_psych, fetch_progress, fetch_moods, fetch_support
    )

    chats_by_user: dict[str, list] = {}
    for c in chats_res.data or []:
        chats_by_user.setdefault(c["user_id"], []).append(c)

    psych_by_user: dict[str, str | None] = {}
    psych_responses_by_user: dict[str, list] = {}
    for p in psych_res.data or []:
        uid = p["user_id"]
        psych_by_user[uid] = p.get("status")
        if p.get("status") == "completed":
            psych_responses_by_user[uid] = p.get("responses") or []

    progress_by_user: dict[str, list[float]] = {}
    for p in progress_res.data or []:
        progress_by_user.setdefault(p["user_id"], []).append(p.get("progress_percent", 0))

    moods_by_user: dict[str, list[float]] = {}
    for m in moods_res.data or []:
        uid = m["user_id"]
        if uid not in moods_by_user:
            moods_by_user[uid] = []
        if len(moods_by_user[uid]) < 3:
            moods_by_user[uid].append(m["mood_score"])

    support_pending_by_user: dict[str, bool] = {}
    for s in support_res.data or []:
        support_pending_by_user[s["user_id"]] = True

    return (
        chats_by_user,
        psych_by_user,
        psych_responses_by_user,
        progress_by_user,
        moods_by_user,
        support_pending_by_user,
    )


def compute_student_risk(user_id: str, institution_id: str) -> dict:
    sb = get_supabase()
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    bulk = _load_bulk_risk_data(sb, [user_id], week_ago)
    return _score_risk_from_data(user_id, institution_id, *bulk, week_ago)


def persist_single_risk_report(user_id: str, institution_id: str) -> dict:
    """Compute and persist a single student's risk report."""
    sb = get_supabase()
    report = compute_student_risk(user_id, institution_id)
    now = datetime.now(timezone.utc).isoformat()
    row = {**report, "computed_at": now}
    sb.table("student_risk_reports").insert(row).execute()
    _invalidate_institution_caches(institution_id)
    return report


def maybe_recompute_on_progress(user_id: str, institution_id: str, new_percent: int, old_percent: int | None) -> None:
    """Recompute risk if progress jumped by threshold."""
    if old_percent is None or new_percent - old_percent >= PROGRESS_RECOMPUTE_THRESHOLD:
        try:
            persist_single_risk_report(user_id, institution_id)
        except Exception:
            pass


def persist_risk_reports(institution_id: str) -> int:
    sb = get_supabase()
    students = sb.table("users").select("id").eq(
        "institution_id", institution_id
    ).eq("role", "student").eq("status", "approved").execute()

    student_ids = [s["id"] for s in (students.data or [])]
    if not student_ids:
        return 0

    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    bulk = _load_bulk_risk_data(sb, student_ids, week_ago)

    now = datetime.now(timezone.utc).isoformat()
    rows = []
    for uid in student_ids:
        report = _score_risk_from_data(uid, institution_id, *bulk, week_ago)
        rows.append({**report, "computed_at": now})

    batch_size = 500
    for i in range(0, len(rows), batch_size):
        sb.table("student_risk_reports").insert(rows[i:i + batch_size]).execute()

    _invalidate_institution_caches(institution_id)
    return len(rows)


def prune_risk_history(institution_id: str, keep_days: int = 90) -> int:
    """Keep only the latest report per student per day; delete older duplicates."""
    sb = get_supabase()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=keep_days)).isoformat()
    reports = sb.table("student_risk_reports").select("id, user_id, computed_at").eq(
        "institution_id", institution_id
    ).lt("computed_at", cutoff).order("computed_at", desc=True).execute()

    if not reports.data:
        return 0

    seen: set[tuple[str, str]] = set()
    to_delete: list[str] = []
    for r in reports.data:
        day = (r.get("computed_at") or "")[:10]
        key = (r["user_id"], day)
        if key in seen:
            to_delete.append(r["id"])
        else:
            seen.add(key)

    for rid in to_delete:
        sb.table("student_risk_reports").delete().eq("id", rid).execute()
    return len(to_delete)


def get_risk_history(student_id: str, limit: int = 10) -> list[dict]:
    sb = get_supabase()
    result = sb.table("student_risk_reports").select(
        "risk_level, risk_score, factors, dominant_cause, computed_at"
    ).eq("user_id", student_id).order("computed_at", desc=True).limit(limit).execute()
    return result.data or []


def get_cohort_risk_alerts(institution_id: str) -> list[dict]:
    """Group at-risk students by program and semester."""
    rows = get_latest_risk_by_institution(institution_id, risk_level=None)
    at_risk = [r for r in rows if r.get("risk_level") in ("alto", "moderado")]
    cohorts: dict[str, dict] = {}
    for r in at_risk:
        program = r.get("program") or "Sin programa"
        semester = r.get("semester")
        key = f"{program}|{semester or '—'}"
        if key not in cohorts:
            cohorts[key] = {
                "program": program,
                "semester": semester,
                "count": 0,
                "alto": 0,
                "moderado": 0,
            }
        cohorts[key]["count"] += 1
        if r.get("risk_level") == "alto":
            cohorts[key]["alto"] += 1
        else:
            cohorts[key]["moderado"] += 1
    return sorted(cohorts.values(), key=lambda c: c["count"], reverse=True)


def _get_latest_risk_via_rpc(institution_id: str) -> list[dict] | None:
    sb = get_supabase()
    try:
        result = sb.rpc("latest_risk_by_institution", {"p_institution_id": institution_id}).execute()
        rows = result.data or []
        if rows:
            enriched = []
            for row in rows:
                factors = row.get("factors") or []
                if isinstance(factors, str):
                    import json
                    try:
                        factors = json.loads(factors)
                    except Exception:
                        factors = []
                row = {**row, "factors": factors}
                row["dominant_cause"] = row.get("dominant_cause") or compute_dominant_cause(factors)
                enriched.append(row)
            return sorted(enriched, key=lambda x: x.get("risk_score") or 0, reverse=True)
        return rows
    except Exception:
        return None


def _get_latest_risk_legacy(institution_id: str) -> list[dict]:
    sb = get_supabase()
    students = sb.table("users").select("id, full_name, email").eq(
        "institution_id", institution_id
    ).eq("role", "student").eq("status", "approved").execute()

    if not students.data:
        return []

    student_ids = [s["id"] for s in students.data]

    def fetch_profiles():
        return sb.table("student_profiles").select("user_id, program, semester").in_(
            "user_id", student_ids
        ).execute()

    def fetch_risks():
        return sb.table("student_risk_reports").select("*").in_(
            "user_id", student_ids
        ).order("computed_at", desc=True).execute()

    profiles_res, risks_res = run_parallel(fetch_profiles, fetch_risks)

    profile_map = {p["user_id"]: p for p in (profiles_res.data or [])}
    risk_map: dict[str, dict] = {}
    for r in risks_res.data or []:
        if r["user_id"] not in risk_map:
            risk_map[r["user_id"]] = r

    missing_ids = [uid for uid in student_ids if uid not in risk_map]
    computed_map: dict[str, dict] = {}
    if missing_ids:
        week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        bulk = _load_bulk_risk_data(sb, missing_ids, week_ago)
        for uid in missing_ids:
            computed_map[uid] = _score_risk_from_data(uid, institution_id, *bulk, week_ago)

    results = []
    for s in students.data:
        uid = s["id"]
        profile = profile_map.get(uid)
        row = {
            "user_id": uid,
            "full_name": s.get("full_name") or s.get("email"),
            "program": profile.get("program") if profile else None,
            "semester": profile.get("semester") if profile else None,
        }
        if uid in risk_map:
            row.update(risk_map[uid])
        else:
            row.update(computed_map[uid])
        if not row.get("dominant_cause"):
            row["dominant_cause"] = compute_dominant_cause(row.get("factors") or [])
        results.append(row)

    results.sort(key=lambda x: x.get("risk_score", 0), reverse=True)
    return results


def invalidate_risk_cache(institution_id: str) -> None:
    risk_cache.invalidate(institution_id)


def get_latest_risk_by_institution(
    institution_id: str,
    *,
    risk_level: str | None = None,
    program: str | None = None,
    search: str | None = None,
    min_score: float | None = None,
    dominant_cause: str | None = None,
) -> list[dict]:
    cached = risk_cache.get(institution_id)
    if cached is None:
        rows = _get_latest_risk_via_rpc(institution_id)
        if rows is None:
            rows = _get_latest_risk_legacy(institution_id)
        risk_cache.set(institution_id, rows)
        cached = rows

    rows = list(cached)
    if risk_level:
        rows = [r for r in rows if r.get("risk_level") == risk_level]
    if program:
        needle = program.strip().lower()
        rows = [r for r in rows if needle in (r.get("program") or "").lower()]
    if search:
        needle = search.strip().lower()
        rows = [
            r for r in rows
            if needle in (r.get("full_name") or "").lower()
        ]
    if min_score is not None:
        rows = [r for r in rows if (r.get("risk_score") or 0) >= min_score]
    if dominant_cause:
        rows = [r for r in rows if r.get("dominant_cause") == dominant_cause]
    return rows
