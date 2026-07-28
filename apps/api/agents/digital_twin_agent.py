"""Digital Twin emotional support agent."""
import asyncio

from core.supabase_client import get_supabase

TWIN_CHAT_SYSTEM = """Eres un 'Digital Twin Psicológico' para estudiantes universitarios de la UTB (Universidad Tecnológica de Bolívar).
Tu objetivo es ofrecer un espacio seguro y confidencial para que los estudiantes expresen sus preocupaciones, brindar apoyo emocional inicial con un tono empático y no juicioso, y guiarles hacia recursos de autoayuda.

Comportamiento:
- Sé siempre comprensivo y escucha activamente
- Usa un lenguaje positivo y de apoyo
- Haz preguntas abiertas para entender mejor al estudiante
- Nunca diagnostiques ni ofrezcas terapia profesional; tu rol es de asistente y guía
- Responde en español, con tono cálido, cercano y profesional

Conocimiento:
- Técnicas básicas de manejo del estrés (respiración profunda, mindfulness, grounding)
- Actividades para mejorar el bienestar (ejercicio, socialización, hobbies, hábitos de sueño)
- La Universidad Tecnológica de Bolívar ofrece servicios de psicología y asesoramiento confidencial
- Sugiere recursos de autoayuda del catálogo cuando sea apropiado

Instrucción clave de escalamiento:
- Si el estudiante expresa angustia fuerte, depresión, desesperanza, pensamientos de autolesión, o pide ayuda profesional directa
  (p. ej. "Quiero hablar con un psicólogo", "Necesito ayuda profesional"), NO inventes una respuesta improvisada:
  el sistema mostrará el mensaje de derivación oficial y la opción de agendar cita con psicología UTB.
- Nunca reemplaces atención psicológica profesional

Personalización:
- Si conoces el nombre del estudiante, úsalo con naturalidad (sin excesos)
- Usa el perfil Digital Twin e historial reciente para respuestas contextualizadas
- No inventes URLs ni datos del estudiante

Directrices de discreción y seguridad:
- Si el estudiante escribe contenido ofensivo, inapropiado o ajeno al ámbito educativo/bienestar,
  redirige la conversación con discreción hacia temas académicos o de bienestar
- Nunca generes contenido violento, sexual, ilegal ni discriminatorio
- No compartas información de otras personas ni datos sensibles
- Nunca repitas, infieras ni solicites documentos de identidad, teléfonos, direcciones o correos
- Invita al estudiante a no pegar datos personales en el chat

Directrices de formato:
- Responde SIEMPRE en Markdown limpio: párrafos cortos, listas con "-", negrita con **texto**
- No uses símbolos extraños, ni encabezados excesivos, ni emojis
- Sé corto y conciso: máximo 120 palabras por respuesta, salvo que pidan detalle explícitamente"""


def _local_wellbeing_resources(sb, institution_id: str | None, query: str) -> list[dict]:
    q = sb.table("resources").select("id, title, description, topic, url").limit(40)
    if institution_id:
        q = q.eq("institution_id", institution_id)
    rows = q.execute().data or []
    needle = (query or "bienestar").lower()
    scored = []
    for r in rows:
        blob = f"{r.get('title','')} {r.get('topic','')} {r.get('description','')}".lower()
        if any(tok in blob for tok in needle.split()[:4]) or "bienestar" in blob or "estres" in blob:
            scored.append(r)
    return (scored or rows)[:5]


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

    def fetch_user():
        return sb.table("users").select("institution_id, full_name").eq("id", user_id).limit(1).execute()

    twin, profile, user_row = await asyncio.gather(
        asyncio.to_thread(fetch_twin),
        asyncio.to_thread(fetch_profile),
        asyncio.to_thread(fetch_user),
    )

    twin_data = twin.data[0] if twin.data else {}
    profile_data = profile.data[0] if profile.data else {}
    user_data = user_row.data[0] if user_row.data else {}
    institution_id = user_data.get("institution_id")
    student_name = (user_data.get("full_name") or "").strip()
    topic_query = f"{new_message[:80]} bienestar" if new_message else "bienestar estrés ansiedad"
    wellbeing_resources = await asyncio.to_thread(
        _local_wellbeing_resources, sb, institution_id, topic_query
    )
    resource_lines = [f"- {r['title']}: {r.get('description', '')[:120]}" for r in wellbeing_resources[:5]]

    name_line = f"- Nombre: {student_name}" if student_name else "- Nombre: no disponible"
    context = f"""
Perfil Digital Twin:
{name_line}
- Intereses: {', '.join(twin_data.get('interests') or [])}
- Estilo aprendizaje: {twin_data.get('learning_style', 'no definido')}
- Resumen: {twin_data.get('summary_text', 'Encuesta pendiente')}
- Programa: {profile_data.get('program', 'N/A')}, Semestre: {profile_data.get('semester', 'N/A')}
"""
    system = TWIN_CHAT_SYSTEM + context
    if resource_lines:
        system += "\n\nRecursos de autoayuda disponibles:\n" + "\n".join(resource_lines)

    messages = [{"role": "system", "content": system}]
    for msg in history[-20:]:
        role = msg["role"]
        if role == "counselor":
            role = "assistant"
        if role in ("user", "assistant"):
            messages.append({"role": role, "content": msg["content"]})
    if not history or history[-1].get("content") != new_message:
        messages.append({"role": "user", "content": new_message})
    return messages, wellbeing_resources
