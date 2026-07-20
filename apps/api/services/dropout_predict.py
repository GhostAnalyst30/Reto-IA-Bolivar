"""DropoutPredict + impact metrics for retention dashboard."""
from __future__ import annotations

import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path

from core.supabase_client import get_supabase

UTB_INSTITUTION_ID = "a0000000-0000-4000-8000-000000000001"
MODEL_PATH = Path(__file__).resolve().parents[3] / "scripts" / "dropout_model_baseline.json"


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def _load_model() -> dict | None:
    if not MODEL_PATH.exists():
        return None
    try:
        return json.loads(MODEL_PATH.read_text(encoding="utf-8"))
    except Exception:
        return None


def predict_dropout_probability(risk_score: float, model: dict | None = None) -> float:
    """Logistic: P = sigmoid(intercept + coef * risk_score). Fallback: risk_score/100."""
    model = model if model is not None else _load_model()
    if not model or model.get("model") != "logistic_regression":
        return round(min(0.95, max(0.05, float(risk_score) / 100.0)), 4)
    try:
        coef = float(model["coefficients"][0][0])
        intercept = float(model["intercept"][0])
        return round(_sigmoid(intercept + coef * float(risk_score)), 4)
    except Exception:
        return round(min(0.95, max(0.05, float(risk_score) / 100.0)), 4)


def ml_prediction_summary(institution_id: str = UTB_INSTITUTION_ID) -> dict:
    from services.risk_service import get_latest_risk_by_institution

    model = _load_model()
    rows = get_latest_risk_by_institution(institution_id) or []
    predictions = []
    for r in rows:
        score = float(r.get("risk_score") or 0)
        prob = predict_dropout_probability(score, model)
        predictions.append({
            "user_id": r["user_id"],
            "risk_score": score,
            "risk_level": r.get("risk_level"),
            "dominant_cause": r.get("dominant_cause"),
            "dropout_probability": prob,
            "contributing_factors": [
                f.get("label") for f in (r.get("factors") or [])[:4] if isinstance(f, dict)
            ],
        })

    predictions.sort(key=lambda x: x["dropout_probability"], reverse=True)
    avg_prob = (
        sum(p["dropout_probability"] for p in predictions) / len(predictions)
        if predictions else 0.0
    )
    high = sum(1 for p in predictions if p["dropout_probability"] >= 0.5)

    return {
        "model_loaded": bool(model),
        "model_meta": {
            "cv_accuracy_mean": (model or {}).get("cv_accuracy_mean"),
            "training_samples": (model or {}).get("training_samples"),
            "feature": (model or {}).get("feature", "risk_score"),
        } if model else None,
        "students_scored": len(predictions),
        "avg_dropout_probability": round(avg_prob, 4),
        "high_probability_count": high,
        "top_risk": predictions[:20],
        "heuristic_fallback": not bool(model),
    }


def impact_metrics(institution_id: str = UTB_INSTITUTION_ID) -> dict:
    """Students who improved/worsened vs prior risk report + CareQueue resolution."""
    sb = get_supabase()
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

    # Latest two reports per student via fetch + group
    reports = (
        sb.table("student_risk_reports")
        .select("user_id, risk_level, risk_score, computed_at")
        .eq("institution_id", institution_id)
        .gte("computed_at", (datetime.now(timezone.utc) - timedelta(days=21)).isoformat())
        .order("computed_at", desc=True)
        .limit(2000)
        .execute()
    )
    by_user: dict[str, list] = {}
    for r in reports.data or []:
        by_user.setdefault(r["user_id"], []).append(r)

    improved, worsened, stable = [], [], []
    level_rank = {"bajo": 0, "moderado": 1, "alto": 2}
    for uid, hist in by_user.items():
        if len(hist) < 2:
            continue
        cur, prev = hist[0], hist[1]
        cur_r = level_rank.get(cur.get("risk_level"), 0)
        prev_r = level_rank.get(prev.get("risk_level"), 0)
        delta = float(cur.get("risk_score") or 0) - float(prev.get("risk_score") or 0)
        entry = {
            "user_id": uid,
            "from_level": prev.get("risk_level"),
            "to_level": cur.get("risk_level"),
            "score_delta": round(delta, 1),
        }
        if cur_r < prev_r or delta <= -10:
            improved.append(entry)
        elif cur_r > prev_r or delta >= 10:
            worsened.append(entry)
        else:
            stable.append(entry)

    tickets = (
        sb.table("care_queue_tickets")
        .select("id, status, created_at, resolved_at, contacted_at, sla_due_at")
        .eq("institution_id", institution_id)
        .gte("created_at", week_ago)
        .execute()
    )
    tdata = tickets.data or []
    resolved = [t for t in tdata if t.get("status") == "resuelto"]
    open_t = [t for t in tdata if t.get("status") != "resuelto"]
    contacted_fast = 0
    for t in tdata:
        if not t.get("contacted_at") and t.get("status") == "nuevo":
            continue
        # contacted within 48h of creation
        try:
            created = datetime.fromisoformat(str(t["created_at"]).replace("Z", "+00:00"))
            contacted = t.get("contacted_at") or t.get("resolved_at")
            if contacted:
                ct = datetime.fromisoformat(str(contacted).replace("Z", "+00:00"))
                if (ct - created).total_seconds() <= 48 * 3600:
                    contacted_fast += 1
        except Exception:
            pass

    outcomes = (
        sb.table("student_academic_outcomes")
        .select("enrollment_status")
        .eq("institution_id", institution_id)
        .execute()
    )
    status_counts: dict[str, int] = {}
    for o in outcomes.data or []:
        s = o.get("enrollment_status") or "activo"
        status_counts[s] = status_counts.get(s, 0) + 1

    return {
        "window_days": 7,
        "improved_count": len(improved),
        "worsened_count": len(worsened),
        "stable_count": len(stable),
        "improved": improved[:30],
        "worsened": worsened[:30],
        "care_queue": {
            "opened_7d": len(tdata),
            "open_now": len(open_t),
            "resolved_7d": len(resolved),
            "contacted_within_48h": contacted_fast,
            "contact_rate_48h": round(contacted_fast / len(tdata), 3) if tdata else None,
        },
        "outcomes": status_counts,
    }
