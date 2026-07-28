"""Generate Digital Twin profile from psychometric responses (rule-based, sin LLM)."""
from __future__ import annotations


INTEREST_CHOICE_MAP = {
    "Tecnología": "Tecnología e innovación",
    "Tecnologia": "Tecnología e innovación",
    "Emprendimiento": "Emprendimiento",
    "Investigación": "Investigación académica",
    "Investigacion": "Investigación académica",
    "Bienestar": "Bienestar y acompañamiento",
    "Artes": "Creatividad y artes",
}

GOAL_INTEREST_MAP = {
    "Trabajar en una empresa": "Desarrollo profesional",
    "Emprender": "Emprendimiento",
    "Estudiar un posgrado": "Formación avanzada",
    "Investigar": "Investigación académica",
    "Aún no lo sé": "Exploración vocacional",
}


def generate_twin_profile(responses: list[dict], academic: dict | None = None) -> dict:
    """Perfil Digital Twin determinista a partir de respuestas fijas."""
    return _rule_based_profile(responses, academic)


async def generate_twin_profile_async(responses: list[dict], academic: dict | None = None) -> dict:
    return generate_twin_profile(responses, academic)


def _avg_for_tags(responses: list[dict], tags: set[str], *, reverse_aware: bool = True) -> float | None:
    values: list[float] = []
    for r in responses:
        rtags = set(r.get("tags") or [])
        if not rtags & tags:
            continue
        raw = r.get("value")
        if isinstance(raw, (int, float)):
            v = float(raw)
            if reverse_aware and r.get("reverse"):
                v = 6.0 - v
            values.append(v)
    if not values:
        return None
    return sum(values) / len(values)


def _choice_values(responses: list[dict], tags: set[str]) -> list[str]:
    out: list[str] = []
    for r in responses:
        rtags = set(r.get("tags") or [])
        if not rtags & tags:
            continue
        val = r.get("value")
        if isinstance(val, str) and val.strip():
            out.append(val.strip())
    return out


def _rule_based_profile(responses: list[dict], academic: dict | None = None) -> dict:
    motivacion = _avg_for_tags(responses, {"motivacion", "metas"}) or 3.0
    social = _avg_for_tags(responses, {"social"}) or 3.0
    bienestar = _avg_for_tags(responses, {"bienestar", "estres"}) or 3.0
    organizacion = _avg_for_tags(responses, {"organizacion"}) or 3.0

    style_scores = {
        "visual": _avg_for_tags(responses, {"visual"}) or 0.0,
        "auditivo": _avg_for_tags(responses, {"auditivo"}) or 0.0,
        "kinestésico": _avg_for_tags(responses, {"kinestesico"}) or 0.0,
    }
    if max(style_scores.values()) <= 0:
        learning_style = "mixto"
    else:
        top = max(style_scores, key=style_scores.get)
        second = sorted(style_scores.values(), reverse=True)
        learning_style = "mixto" if len(second) > 1 and second[0] - second[1] < 0.5 else top

    interests: list[str] = []
    for choice in _choice_values(responses, {"intereses"}):
        interests.append(INTEREST_CHOICE_MAP.get(choice, choice))
    for choice in _choice_values(responses, {"metas"}):
        mapped = GOAL_INTEREST_MAP.get(choice)
        if mapped and mapped not in interests:
            interests.append(mapped)

    if academic and academic.get("program"):
        prog = str(academic["program"]).strip()
        if prog and prog not in interests:
            interests.insert(0, f"Programa: {prog}")

    if not interests:
        interests = ["Aprendizaje continuo", "Desarrollo personal", "Comunidad universitaria"]

    interests = interests[:5]

    if bienestar >= 4:
        emotional = "Reportas un bienestar emocional sólido y hábitos relativamente estables."
    elif bienestar >= 2.5:
        emotional = "Tu bienestar está en un rango moderado; conviene reforzar estrategias de autocuidado."
    else:
        emotional = "Detectamos señales de carga emocional elevada; el acompañamiento UTB puede ayudarte."

    summary = (
        f"Tus intereses principales incluyen {', '.join(interests[:3])}. "
        f"Tu estilo de aprendizaje parece ser {learning_style}. "
        f"Motivación {motivacion:.1f}/5, organización {organizacion:.1f}/5 y red social {social:.1f}/5. "
        f"{emotional}"
    )

    return {
        "interests": interests,
        "learning_style": learning_style,
        "emotional_baseline": emotional,
        "summary_text": summary,
        "traits": {
            "resiliencia": int(min(100, max(0, bienestar * 20))),
            "motivacion": int(min(100, max(0, motivacion * 20))),
            "social": int(min(100, max(0, social * 20))),
            "organizacion": int(min(100, max(0, organizacion * 20))),
        },
    }


# Compatibilidad con imports antiguos
def _fallback_profile(responses: list[dict]) -> dict:
    return _rule_based_profile(responses)
