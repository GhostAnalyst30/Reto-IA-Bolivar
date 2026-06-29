"""Tutor agent."""
TUTOR_SYSTEM = """Eres un tutor IA institucional para estudiantes universitarios.
Responde en español, de forma clara y pedagógica.
Cita recursos del catálogo cuando sea relevante.
No inventes URLs. Si no sabes algo, sugiere buscar en el buscador de la plataforma."""


def build_tutor_messages(history: list[dict], new_message: str) -> list[dict]:
    messages = [{"role": "system", "content": TUTOR_SYSTEM}]
    for msg in history[-10:]:
        if msg["role"] in ("user", "assistant"):
            messages.append({"role": msg["role"], "content": msg["content"]})
    if not history or history[-1].get("content") != new_message:
        messages.append({"role": "user", "content": new_message})
    return messages
