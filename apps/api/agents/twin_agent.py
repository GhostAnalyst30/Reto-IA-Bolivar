"""Generate Digital Twin profile from psychometric responses."""
import json
from core.llm_router import complete_with_fallback

TWIN_SYSTEM = """Eres un orientador de la UTB. A partir de respuestas psicométricas, genera un perfil Digital Twin básico en JSON.
Responde SOLO con JSON válido sin markdown:
{
  "interests": ["interés1", "interés2", "interés3"],
  "learning_style": "visual|auditivo|kinestésico|lectoescritor|mixto",
  "emotional_baseline": "breve descripción del perfil emocional inicial",
  "summary_text": "Párrafo amigable en segunda persona: Tus intereses principales son... Tu estilo de aprendizaje...",
  "traits": {"resiliencia": 0-100, "motivacion": 0-100, "social": 0-100}
}"""


async def generate_twin_profile(responses: list[dict], academic: dict | None = None) -> dict:
    academic_ctx = ""
    if academic:
        academic_ctx = f"\nDatos académicos: programa={academic.get('program')}, semestre={academic.get('semester')}"

    prompt = f"Respuestas encuesta psicométrica:\n{json.dumps(responses, ensure_ascii=False)}{academic_ctx}"
    messages = [
        {"role": "system", "content": TWIN_SYSTEM},
        {"role": "user", "content": prompt},
    ]
    try:
        _, raw, _ = await complete_with_fallback(messages, skip_thinking=True)
        text = raw.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception:
        return _fallback_profile(responses)


def _fallback_profile(responses: list[dict]) -> dict:
    avg = sum(r.get("value", 3) for r in responses if isinstance(r.get("value"), (int, float))) / max(len(responses), 1)
    return {
        "interests": ["Aprendizaje continuo", "Desarrollo personal", "Comunidad universitaria"],
        "learning_style": "mixto",
        "emotional_baseline": "Perfil en construcción basado en tu encuesta inicial.",
        "summary_text": (
            "Tus intereses principales incluyen el crecimiento académico y personal. "
            "Tu estilo de aprendizaje parece ser mixto, adaptándote a diferentes contextos. "
            f"Tu nivel de bienestar reportado promedia {avg:.1f}/5 en la encuesta inicial."
        ),
        "traits": {"resiliencia": int(avg * 20), "motivacion": int(avg * 18), "social": int(avg * 17)},
    }
