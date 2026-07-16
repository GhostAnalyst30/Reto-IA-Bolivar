"""Respuestas humanas del equipo de bienestar cuando el LLM no está disponible."""
from __future__ import annotations

PSYCHOLOGIST_EMAIL = "psicologo.demo@utb.edu.co"
PSYCHOLOGIST_DEFAULT_NAME = "Lic. María Fernanda Ortiz"

_COUNSELOR_CACHE: dict | None = None


def _load_counselor_profile() -> dict:
    global _COUNSELOR_CACHE
    if _COUNSELOR_CACHE is not None:
        return _COUNSELOR_CACHE

    try:
        from core.supabase_client import get_supabase

        sb = get_supabase()
        row = (
            sb.table("users")
            .select("full_name, email")
            .eq("email", PSYCHOLOGIST_EMAIL)
            .limit(1)
            .execute()
        )
        if row.data:
            _COUNSELOR_CACHE = row.data[0]
            return _COUNSELOR_CACHE
    except Exception:
        pass

    _COUNSELOR_CACHE = {"full_name": PSYCHOLOGIST_DEFAULT_NAME, "email": PSYCHOLOGIST_EMAIL}
    return _COUNSELOR_CACHE


def _first_name(student: dict | None) -> str:
    if not student:
        return ""
    raw = (student.get("full_name") or "").strip()
    return raw.split()[0] if raw else ""


def _signature(counselor: dict) -> str:
    name = counselor.get("full_name") or PSYCHOLOGIST_DEFAULT_NAME
    email = counselor.get("email") or PSYCHOLOGIST_EMAIL
    return f"\n\n— **{name}**\nPsicóloga · Bienestar estudiantil UTB\n*{email}*"


def build_counselor_response(user_message: str, student: dict | None = None) -> str:
    """Genera una respuesta empática y humana sin depender del LLM."""
    counselor = _load_counselor_profile()
    name = _first_name(student)
    saludo = f"Hola{', ' + name if name else ''}. " if name else "Hola. "
    msg = (user_message or "").lower().strip()

    if any(w in msg for w in ("ansiedad", "ansios", "nervios", "nervio", "pánico", "panico")):
        body = (
            f"{saludo}Soy **{counselor.get('full_name', PSYCHOLOGIST_DEFAULT_NAME).split(',')[0]}** del equipo de bienestar UTB. "
            "Leí lo que compartes y entiendo que la ansiedad puede sentirse muy intensa en momentos de exámenes o cambios. "
            "Respira lento: inhala contando hasta cuatro y exhala contando hasta seis. "
            "No estás exagerando; lo que sientes es válido. "
            "Si hoy se siente demasiado, podemos agendar un espacio contigo sin juicio. "
            "¿Qué fue lo que más te disparó la ansiedad en las últimas horas?"
        )
    elif any(w in msg for w in ("triste", "deprim", "solo", "sola", "vacío", "vacio", "llor")):
        body = (
            f"{saludo}Gracias por confiar y escribirme. Soy del área de bienestar UTB y estoy aquí para escucharte. "
            "Cuando aparece tristeza sostenida, a veces el cuerpo pide descanso, compañía o hablar con alguien que no juzgue. "
            "No tienes que resolverlo todo hoy. "
            "Me gustaría entender mejor: ¿desde cuándo te has sentido así y hay algo en la UTB que te esté pesando más?"
        )
    elif any(w in msg for w in ("desmotiv", "abandono", "dejar", "retir", "deserción", "desercion", "no puedo más", "no puedo mas")):
        body = (
            f"{saludo}Lo que cuentas me importa. Muchos estudiantes atraviesan momentos en los que dudan si continuar, "
            "y eso no los hace débiles. A veces es señal de cansancio, presión académica o cosas fuera del aula. "
            "Antes de tomar una decisión grande, vale la pena hablarlo con calma. "
            "¿Qué es lo que más te hace pensar en retirarte ahora mismo?"
        )
    elif any(w in msg for w in ("estrés", "estres", "examen", "nota", "aprobar", " reprob", "académ", "academ")):
        body = (
            f"{saludo}Entiendo la presión académica; es muy común en la UTB y puede agotar. "
            "Una estrategia que ayuda es dividir lo urgente en pasos pequeños: una tarea hoy, no todo el semestre. "
            "También está bien pedir apoyo a profesores o compañeros. "
            "Cuéntame: ¿qué materia o situación te está generando más estrés en este momento?"
        )
    elif any(w in msg for w in ("gracias", "thank")):
        body = (
            f"{saludo}Con gusto. Me alegra que estés usando este espacio. "
            "Seguir hablando de lo que sientes también es una forma de cuidarte. "
            "Cuando quieras, puedes escribirme de nuevo."
        )
    else:
        body = (
            f"{saludo}Soy **{counselor.get('full_name', PSYCHOLOGIST_DEFAULT_NAME).split(',')[0]}**, "
            "psicóloga del equipo de bienestar UTB. Recibí tu mensaje y quiero acompañarte de verdad, "
            "no con respuestas automáticas. "
            "Este es un espacio confidencial para hablar de cómo te sientes en la vida universitaria. "
            "¿Podrías contarme un poco más sobre qué te trae por aquí hoy?"
        )

    return body + _signature(counselor)
