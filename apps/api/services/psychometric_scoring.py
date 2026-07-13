"""Extract dropout-risk factors from psychometric survey responses."""

FACTOR_CAUSE_MAP: dict[str, str] = {
    "inactivity": "desengagement",
    "survey": "onboarding",
    "progress": "academico",
    "mood": "emocional",
    "estres_alto": "emocional",
    "motivacion_baja": "motivacional",
    "apoyo_social_bajo": "social",
    "situacion_economica": "economico",
    "solicitud_apoyo_activa": "emocional",
}


def _likert_value(resp: dict) -> float | None:
    val = resp.get("value")
    if isinstance(val, (int, float)):
        score = float(val)
        if resp.get("reverse"):
            score = 6 - score
        return score
    return None


def score_psychometric_responses(responses: list[dict] | None) -> list[dict]:
    """Return risk factor dicts from psychometric responses."""
    if not responses:
        return []

    tag_scores: dict[str, list[float]] = {}
    economic_choice: str | None = None

    for resp in responses:
        tags = resp.get("tags") or []
        resp_type = resp.get("type", "likert")

        if resp_type == "choice" and "socioeconomico" in tags:
            economic_choice = str(resp.get("value") or "")
            continue

        val = _likert_value(resp)
        if val is None:
            continue
        for tag in tags:
            if tag in ("estres", "motivacion", "social", "organizacion", "bienestar"):
                tag_scores.setdefault(tag, []).append(val)

    factors: list[dict] = []

    def _avg(tag: str) -> float | None:
        vals = tag_scores.get(tag)
        if not vals:
            return None
        return sum(vals) / len(vals)

    estres_avg = _avg("estres")
    if estres_avg is not None and estres_avg <= 2.5:
        factors.append({
            "key": "estres_alto",
            "label": f"Estrés académico elevado ({estres_avg:.1f}/5)",
            "weight": 15,
        })

    motiv_avg = _avg("motivacion")
    if motiv_avg is not None and motiv_avg <= 2.5:
        factors.append({
            "key": "motivacion_baja",
            "label": f"Baja motivación reportada ({motiv_avg:.1f}/5)",
            "weight": 15,
        })

    social_avg = _avg("social")
    if social_avg is not None and social_avg <= 2.5:
        factors.append({
            "key": "apoyo_social_bajo",
            "label": f"Red de apoyo social limitada ({social_avg:.1f}/5)",
            "weight": 10,
        })

    if economic_choice == "Requiere apoyo":
        factors.append({
            "key": "situacion_economica",
            "label": "Situación económica que requiere apoyo",
            "weight": 15,
        })

    return factors


def compute_dominant_cause(factors: list[dict]) -> str | None:
    """Return the cause category with highest accumulated weight."""
    if not factors:
        return None
    cause_weights: dict[str, float] = {}
    for f in factors:
        key = f.get("key", "")
        cause = FACTOR_CAUSE_MAP.get(key)
        if cause:
            cause_weights[cause] = cause_weights.get(cause, 0) + float(f.get("weight", 0))
    if not cause_weights:
        return None
    return max(cause_weights, key=lambda c: cause_weights[c])
