"""Vocational guidance agent."""
from core.supabase_client import get_supabase
from core.llm_router import complete_with_fallback

VOCATIONAL_SYSTEM = """Eres orientador vocacional de la UTB (Universidad Tecnológica de Bolívar).
Guía al estudiante con preguntas claras sobre intereses, habilidades y valores.
Cuando tengas suficiente información, sugiere programas académicos de la lista disponible.
Responde siempre en español, de forma empática y breve."""


async def get_programs(institution_id: str) -> list[dict]:
    sb = get_supabase()
    result = sb.table("academic_programs").select("id, name, description").eq(
        "institution_id", institution_id
    ).eq("is_active", True).execute()
    return result.data or []


async def vocational_reply(
    history: list[dict],
    user_message: str,
    institution_id: str,
) -> tuple[str, str, list[str]]:
    programs = await get_programs(institution_id)
    program_lines = "\n".join(f"- {p['name']}: {p.get('description', '')}" for p in programs)
    messages = [
        {"role": "system", "content": f"{VOCATIONAL_SYSTEM}\n\nProgramas UTB disponibles:\n{program_lines}"},
    ]
    for h in history[-8:]:
        if h.get("role") in ("user", "assistant"):
            messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": user_message})

    reasoning, answer, _ = await complete_with_fallback(messages)
    suggested = [p["name"] for p in programs if p["name"].lower() in answer.lower()]
    return reasoning, answer, suggested
