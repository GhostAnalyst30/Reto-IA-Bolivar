#!/usr/bin/env python3
"""
Offline dropout risk classifier using student_academic_outcomes + risk signals.

Usage (from repo root):
  cd apps/api && python ../../scripts/train_dropout_model.py

Requires: scikit-learn (pip install scikit-learn)
Falls back to rule-based baseline if insufficient labeled data.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))

from core.supabase_client import get_supabase

UTB_INST = "a0000000-0000-4000-8000-000000000001"
DROPOUT_STATUSES = frozenset({"retirado", "aplazado"})


def load_training_data():
    sb = get_supabase()
    outcomes = sb.table("student_academic_outcomes").select(
        "user_id, enrollment_status"
    ).eq("institution_id", UTB_INST).execute()

    if not outcomes.data or len(outcomes.data) < 10:
        print(json.dumps({
            "status": "insufficient_data",
            "message": "Se necesitan al menos 10 outcomes registrados en student_academic_outcomes",
            "samples": len(outcomes.data or []),
        }, indent=2))
        return None

    user_ids = [o["user_id"] for o in outcomes.data]
    risks = sb.table("student_risk_reports").select(
        "user_id, risk_score, dominant_cause"
    ).in_("user_id", user_ids).order("computed_at", desc=True).execute()

    latest_risk: dict[str, float] = {}
    for r in risks.data or []:
        if r["user_id"] not in latest_risk:
            latest_risk[r["user_id"]] = float(r.get("risk_score") or 0)

    X, y = [], []
    for o in outcomes.data:
        uid = o["user_id"]
        score = latest_risk.get(uid, 0)
        X.append([score])
        y.append(1 if o["enrollment_status"] in DROPOUT_STATUSES else 0)

    return X, y, len(outcomes.data)


def main():
    try:
        from sklearn.linear_model import LogisticRegression
        from sklearn.model_selection import cross_val_score
        import numpy as np
    except ImportError:
        print(json.dumps({
            "status": "missing_dependency",
            "message": "pip install scikit-learn numpy",
        }, indent=2))
        sys.exit(1)

    data = load_training_data()
    if data is None:
        sys.exit(0)

    X, y, n = data
    X_arr = np.array(X)
    y_arr = np.array(y)

    if len(set(y_arr)) < 2:
        print(json.dumps({
            "status": "single_class",
            "message": "Necesita ejemplos de retirado/aplazado y activo/graduado",
            "samples": n,
        }, indent=2))
        sys.exit(0)

    model = LogisticRegression(max_iter=500)
    scores = cross_val_score(model, X_arr, y_arr, cv=min(5, n), scoring="accuracy")
    model.fit(X_arr, y_arr)

    out_path = Path(__file__).resolve().parent / "dropout_model_baseline.json"
    out_path.write_text(json.dumps({
        "model": "logistic_regression",
        "feature": "risk_score",
        "coefficients": model.coef_.tolist(),
        "intercept": model.intercept_.tolist(),
        "cv_accuracy_mean": float(scores.mean()),
        "cv_accuracy_std": float(scores.std()),
        "training_samples": n,
    }, indent=2), encoding="utf-8")

    print(json.dumps({
        "status": "ok",
        "cv_accuracy": round(float(scores.mean()), 3),
        "artifact": str(out_path),
        "note": "Modelo baseline v0 — ampliar features con academic_records en fase futura",
    }, indent=2))


if __name__ == "__main__":
    main()
