"""Digital Twin emotional support agent."""
import asyncio

from core.supabase_client import get_supabase
from agents.search_agent import search_resources

TWIN_CHAT_SYSTEM = """Eres el Digital Twin de acompañamiento de la UTB (Universidad Tecnológica de Bolívar).
Ofreces un espacio seguro, confidencial y empático para estudiantes universitarios.

Directrices de contenido:
- Responde en español, con tono formal, cálido y profesional
- Tu propósito es netamente educativo y de apoyo al estudiante; no te desvíes de ese objetivo
- Personaliza cada respuesta usando el perfil Digital Twin del estudiante (intereses, estilo de aprendizaje, programa)
- Usa técnicas básicas de apoyo: validación emocional, escucha activa, preguntas abiertas
- Identifica señales de estrés, ansiedad o desmotivación sin diagnosticar
- Sugiere recursos de autoayuda del catálogo cuando sea apropiado
- Si detectas riesgo significativo, menciona amablemente la opción de "Solicitar apoyo humano"
- Nunca reemplaces atención psicológica profesional
- No inventes URLs ni datos del estudiante

Directrices de discreción y seguridad:
- Si el estudiante escribe contenido ofensivo, inapropiado o ajeno al ámbito educativo/bienestar,
  redirige la conversación con discreción y respeto hacia temas académicos o de bienestar, sin sermonear
- Nunca generes contenido violento, sexual, ilegal ni discriminatorio
- No compartas información de otras personas ni datos sensibles

Directrices de formato:
- Responde SIEMPRE en Markdown limpio: párrafos cortos, listas con "-", negrita con **texto**
- No uses símbolos extraños, ni encabezados excesivos, ni emojis
- Sé corto y conciso: máximo 120 palabras por respuesta, salvo que pidan detalle explícitamente"""


async def build_digital_twin_messages(
    history: list[dict],
    new_message: str,
    user_id: str,
) -> tuple[list[dict], list[dict]]:
    sb = get_supabase()

    def fetch_twin():
        return sb.table("digital_twin_profiles").select("*").eq("user_id", user_id).limit(1).execute()

    def fetch_profile():
        return sb.table("student_profiles").select("*").eq("user_id", user_id).limit(1).execute()

    twin_task = asyncio.to_thread(fetch_twin)
    profile_task = asyncio.to_thread(fetch_profile)
    # Recursos de autoayuda según el tema de la conversación actual
    topic_query = f"{new_message[:120]} bienestar autoayuda" if new_message else "bienestar estrés ansiedad autoayuda"
    resources_task = search_resources(topic_query)

    twin, profile, wellbeing_resources = await asyncio.gather(
        twin_task, profile_task, resources_task
    )

    twin_data = twin.data[0] if twin.data else {}
    profile_data = profile.data[0] if profile.data else {}
    resource_lines = [f"- {r['title']}: {r.get('description', '')[:120]}" for r in wellbeing_resources[:5]]

    context = f"""
Perfil Digital Twin:
- Intereses: {', '.join(twin_data.get('interests') or [])}
- Estilo aprendizaje: {twin_data.get('learning_style', 'no definido')}
- Resumen: {twin_data.get('summary_text', 'Encuesta pendiente')}
- Programa: {profile_data.get('program', 'N/A')}, Semestre: {profile_data.get('semester', 'N/A')}
"""
    system = TWIN_CHAT_SYSTEM + context
    if resource_lines:
        system += "\n\nRecursos de autoayuda disponibles:\n" + "\n".join(resource_lines)

    messages = [{"role": "system", "content": system}]
    for msg in history[-12:]:
        role = msg["role"]
        if role == "counselor":
            role = "assistant"
        if role in ("user", "assistant"):
            messages.append({"role": role, "content": msg["content"]})
    if not history or history[-1].get("content") != new_message:
        messages.append({"role": "user", "content": new_message})

    return messages, wellbeing_resources[:3]
