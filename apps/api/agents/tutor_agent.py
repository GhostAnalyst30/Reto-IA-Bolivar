"""Tutor agent with catalog context (RAG-lite via text search)."""
from core.supabase_client import get_supabase
from agents.search_agent import search_resources

TUTOR_SYSTEM = """Eres un tutor IA institucional para estudiantes universitarios.
Responde en español, de forma clara y pedagógica.
Cita recursos del catálogo cuando sea relevante (usa el título exacto).
No inventes URLs. Si no sabes algo, sugiere buscar en el buscador de la plataforma."""


async def build_tutor_messages(history: list[dict], new_message: str) -> list[dict]:
    resources = await search_resources(new_message)
    context_lines: list[str] = []

    if resources:
        sb = get_supabase()
        resource_ids = [r["id"] for r in resources[:5]]
        for r in resources[:5]:
            line = f"- {r['title']}"
            if r.get("description"):
                line += f": {r['description'][:180]}"
            if r.get("topic"):
                line += f" [tema: {r['topic']}]"
            context_lines.append(line)

        chunks = (
            sb.table("resource_embeddings")
            .select("chunk_text, resource_id")
            .in_("resource_id", resource_ids)
            .limit(8)
            .execute()
        )
        for chunk in chunks.data or []:
            context_lines.append(f"  » {chunk['chunk_text'][:320]}")

    system = TUTOR_SYSTEM
    if context_lines:
        system += "\n\nContexto del catálogo institucional:\n" + "\n".join(context_lines)

    messages = [{"role": "system", "content": system}]
    for msg in history[-10:]:
        if msg["role"] in ("user", "assistant"):
            messages.append({"role": msg["role"], "content": msg["content"]})
    if not history or history[-1].get("content") != new_message:
        messages.append({"role": "user", "content": new_message})
    return messages
