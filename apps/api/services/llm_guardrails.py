"""Guardrails for LLM chat: crisis, injection, PII, output sanitization."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Literal

from core.config import settings
from core.security_monitor import log_security_event

ChatType = Literal["digital_twin", "institutional", "privileged"]
GuardrailAction = Literal["pass", "block", "redirect", "handoff", "sanitize"]

SAFE_FALLBACK = (
    "Lo siento, no puedo procesar esa solicitud. "
    "Estoy aquí para acompañarte en temas de bienestar y vida universitaria."
)

CRISIS_MESSAGE = (
    "Gracias por confiar y escribirme. Lo que sientes es importante y no estás solo/a. "
    "Un psicólogo del equipo de bienestar UTB te acompañará en este mismo chat. "
    "Si necesitas ayuda inmediata, contacta a la línea 106 en Colombia o acude al servicio de urgencias más cercano."
)

REDIRECT_OFF_TOPIC = (
    "Este espacio está pensado para tu bienestar y vida universitaria. "
    "¿Hay algo relacionado con cómo te sientes o con tu experiencia en la UTB que quieras conversar?"
)

BLOCK_INJECTION = (
    "No puedo continuar con esa instrucción. "
    "Puedo ayudarte con bienestar emocional, estrés académico y recursos de la UTB."
)

BLOCK_PII_THIRD_PARTY = (
    "Por política de privacidad UTB, no compartas ni solicites datos personales de otras personas en este chat. "
    "Hablemos de cómo te sientes tú o de recursos disponibles para ti."
)

BLOCK_PII_INSTITUTIONAL = (
    "Solo puedo responder con indicadores agregados. "
    "Los datos personales identificables están protegidos por la política de privacidad UTB."
)

PII_REDACT_HINT = (
    "Por tu seguridad, evita compartir documentos de identidad, teléfonos o correos en el chat."
)

REDACT_LABELS = {
    "cedula": "[documento protegido]",
    "email": "[email protegido]",
    "phone": "[teléfono protegido]",
    "financial": "[dato financiero protegido]",
    "address": "[dirección protegida]",
    "health": "[información clínica protegida]",
    "academic_pii": "[dato académico protegido]",
}

# --- Pattern sets ---
_INJECTION_PATTERNS = [
    re.compile(p, re.I)
    for p in (
        r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions",
        r"disregard\s+(the\s+)?(system|previous)",
        r"system\s+prompt",
        r"you\s+are\s+now\s+(dan|evil|unrestricted)",
        r"jailbreak",
        r"<\|im_start\|>",
        r"act\s+as\s+(if\s+you\s+)?(have\s+)?no\s+(restrictions|rules|limits)",
        r"reveal\s+(your\s+)?(system|hidden)\s+(prompt|instructions)",
        r"bypass\s+(safety|guardrails|filters)",
    )
]

_CRISIS_PATTERNS = [
    re.compile(p, re.I)
    for p in (
        r"\b(suicid|matarme|quitarme\s+la\s+vida|no\s+quiero\s+vivir)\b",
        r"\b(hacerme\s+daño|autolesión|autolesion|cortarme)\b",
        r"\b(no\s+val[eé]\s+la\s+pena\s+vivir)\b",
        r"\b(acabar\s+con\s+(todo|mi\s+vida))\b",
    )
]

_OFF_TOPIC_PATTERNS = [
    re.compile(p, re.I)
    for p in (
        r"\b(porno|sexo\s+explicit|contenido\s+sexual)\b",
        r"\b(c[oó]mo\s+(hacer|fabricar)\s+(bomba|droga|arma))\b",
        r"\b(hackear|robar\s+cuenta)\b",
    )
]

_PII_REQUEST_PATTERNS = [
    re.compile(p, re.I)
    for p in (
        r"\b(dame|dime|mu[eé]strame|env[ií]ame|necesito)\s+(el\s+)?(email|correo|c[eé]dula|tel[eé]fono|nota[s]?)\s+(de|del)\b",
        r"\b(lista|listado|exportar|export)\s+(de\s+)?(estudiantes|nombres|emails|correos)\b",
        r"\b(datos\s+personales|informaci[oó]n\s+personal)\s+(de|del)\b",
        r"\b(riesgo|nota|promedio)\s+(de|del)\s+estudiante\b",
    )
]

_THIRD_PARTY_PII_PATTERNS = [
    re.compile(p, re.I)
    for p in (
        r"\b(compa[ñn]ero|compa[ñn]era|otro\s+estudiante).{0,40}(c[eé]dula|cc|documento)\b",
        r"\b(c[eé]dula|cc)\s+(de|del)\s+\w+",
    )
]

_ENTITY_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("email", re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")),
    ("phone", re.compile(r"(?:\+57\s?)?(?:3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}|\d{10})\b")),
    (
        "cedula",
        re.compile(
            r"\b(?:CC|cc|c[eé]dula|cedula|TI|ti|pasaporte)\s*[#:\.]?\s*[\d.\s-]{6,12}\d\b",
            re.I,
        ),
    ),
    ("cedula", re.compile(r"\b\d{6,10}\b")),
    ("financial", re.compile(r"\b(?:\d{4}[\s-]?){3,4}\d{1,4}\b")),
    (
        "address",
        re.compile(
            r"\b(?:calle|carrera|cr\.?|cl\.?|av\.?|avenida)\s+\d+[\s#-]+\d+[-\d]*\b",
            re.I,
        ),
    ),
    (
        "health",
        re.compile(
            r"\b(?:diagn[oó]stico|tomo|tomando)\s+(?:de\s+)?[\w\s]{3,40}(?:\d+\s*mg)?\b",
            re.I,
        ),
    ),
    (
        "academic_pii",
        re.compile(
            r"\b(?:nota|promedio|c[oó]digo)\s+(?:de|del)\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?\s*(?:es|:)\s*[\d.,]+",
            re.I,
        ),
    ),
]

_PROHIBITED_OUTPUT = [
    re.compile(p, re.I)
    for p in (
        r"\b(porno|contenido\s+sexual\s+explicit)\b",
        r"\b(c[oó]mo\s+fabricar)\b",
    )
]

_ALLOWED_URL_DOMAINS = ("utb.edu.co", "localhost", "127.0.0.1")

THINKING_TAG = re.compile(r"<thinking>.*?</thinking>", re.DOTALL | re.IGNORECASE)
URL_PATTERN = re.compile(r"https?://[^\s<>\"']+", re.I)


@dataclass
class SensitiveMatch:
    entity_type: str
    severity: str = "medium"


@dataclass
class GuardrailResult:
    allowed: bool = True
    action: GuardrailAction = "pass"
    user_message: str | None = None
    sanitized_text: str | None = None
    flags: list[str] = field(default_factory=list)
    severity: str = "low"
    redacted_input: str | None = None
    privacy_notice: str | None = None


def detect_sensitive_entities(text: str) -> list[SensitiveMatch]:
    if not text:
        return []
    found: list[SensitiveMatch] = []
    seen_types: set[str] = set()
    for entity_type, pattern in _ENTITY_PATTERNS:
        if pattern.search(text) and entity_type not in seen_types:
            seen_types.add(entity_type)
            sev = "high" if entity_type in ("cedula", "financial", "health") else "medium"
            found.append(SensitiveMatch(entity_type=entity_type, severity=sev))
    return found


def redact_sensitive_text(text: str) -> str:
    if not text:
        return text
    out = text
    for entity_type, pattern in _ENTITY_PATTERNS:
        label = REDACT_LABELS.get(entity_type, "[dato protegido]")
        out = pattern.sub(label, out)
    return out


def contains_third_party_pii(text: str) -> bool:
    if any(p.search(text) for p in _THIRD_PARTY_PII_PATTERNS):
        return True
    entities = detect_sensitive_entities(text)
    cedula_count = sum(1 for e in entities if e.entity_type == "cedula")
    return cedula_count >= 2


def _matches_any(text: str, patterns: list[re.Pattern[str]]) -> bool:
    return any(p.search(text) for p in patterns)


def _log_guardrail(
    event_type: str,
    severity: str,
    user_id: str | None,
    chat_type: ChatType,
    flags: list[str],
    entity_types: list[str] | None = None,
) -> None:
    details: dict = {"chat_type": chat_type, "flags": flags}
    if entity_types:
        details["entity_types"] = entity_types
    log_security_event(event_type, severity=severity, user_id=user_id, details=details)


def check_input(
    text: str,
    chat_type: ChatType,
    *,
    history: list[str] | None = None,
    user_id: str | None = None,
    role: str | None = None,
) -> GuardrailResult:
    if not settings.guardrails_enabled:
        return GuardrailResult(action="pass", redacted_input=text)

    stripped = (text or "").strip()
    if not stripped:
        return GuardrailResult(
            allowed=False,
            action="block",
            user_message="Escribe un mensaje para continuar la conversación.",
            flags=["empty"],
            severity="low",
        )

    if len(stripped) > settings.chat_max_input_chars:
        return GuardrailResult(
            allowed=False,
            action="block",
            user_message=f"Tu mensaje es muy largo. Intenta con menos de {settings.chat_max_input_chars} caracteres.",
            flags=["length"],
            severity="low",
        )

    if history and sum(1 for h in history[-5:] if h.strip().lower() == stripped.lower()) >= 2:
        return GuardrailResult(
            allowed=False,
            action="block",
            user_message="Recibí el mismo mensaje varias veces. ¿Quieres contarme algo más sobre cómo te sientes?",
            flags=["spam"],
            severity="low",
        )

    if _matches_any(stripped, _INJECTION_PATTERNS):
        _log_guardrail("injection_attempt", "high", user_id, chat_type, ["injection"])
        return GuardrailResult(
            allowed=False,
            action="block",
            user_message=BLOCK_INJECTION,
            flags=["injection"],
            severity="high",
        )

    # Privileged staff (admin / psychologist / platform) may ask about system data.
    if chat_type == "institutional" and _matches_any(stripped, _PII_REQUEST_PATTERNS):
        _log_guardrail("pii_exposure_attempt", "high", user_id, chat_type, ["pii_request"], ["cedula", "email"])
        return GuardrailResult(
            allowed=False,
            action="block",
            user_message=BLOCK_PII_INSTITUTIONAL,
            flags=["pii_request"],
            severity="high",
        )

    if (
        chat_type != "privileged"
        and settings.guardrails_block_third_party_pii
        and contains_third_party_pii(stripped)
    ):
        _log_guardrail(
            "pii_exposure_attempt",
            "high",
            user_id,
            chat_type,
            ["pii_third_party"],
            [e.entity_type for e in detect_sensitive_entities(stripped)],
        )
        return GuardrailResult(
            allowed=False,
            action="block",
            user_message=BLOCK_PII_THIRD_PARTY if chat_type == "digital_twin" else BLOCK_PII_INSTITUTIONAL,
            flags=["pii_third_party"],
            severity="high",
        )

    if chat_type == "digital_twin" and _matches_any(stripped, _CRISIS_PATTERNS):
        _log_guardrail("guardrail_crisis", "critical", user_id, chat_type, ["crisis"])
        return GuardrailResult(
            allowed=False,
            action="handoff",
            user_message=CRISIS_MESSAGE,
            flags=["crisis"],
            severity="critical",
        )

    if chat_type == "digital_twin" and _matches_any(stripped, _OFF_TOPIC_PATTERNS):
        return GuardrailResult(
            allowed=False,
            action="redirect",
            user_message=REDIRECT_OFF_TOPIC,
            flags=["off_topic"],
            severity="medium",
        )

    redacted_input = stripped
    privacy_notice = None
    # Do not aggressively redact numeric KPIs for privileged chats
    entities = detect_sensitive_entities(stripped) if chat_type != "privileged" else []
    if entities and settings.guardrails_redact_input_pii:
        redacted_input = redact_sensitive_text(stripped)
        if redacted_input != stripped:
            privacy_notice = PII_REDACT_HINT
            return GuardrailResult(
                allowed=True,
                action="sanitize",
                redacted_input=redacted_input,
                sanitized_text=redacted_input,
                flags=["pii_input_redacted"],
                severity="medium",
                privacy_notice=privacy_notice,
            )

    return GuardrailResult(action="pass", redacted_input=redacted_input, sanitized_text=stripped)


def _sanitize_urls(text: str) -> str:
    def _replace(match: re.Match[str]) -> str:
        url = match.group(0)
        if any(d in url.lower() for d in _ALLOWED_URL_DOMAINS):
            return url
        return "[enlace removido]"

    return URL_PATTERN.sub(_replace, text)


def check_output(
    text: str,
    chat_type: ChatType,
    *,
    user_id: str | None = None,
    already_sanitized: bool = False,
) -> GuardrailResult:
    if not settings.guardrails_enabled or not text:
        return GuardrailResult(action="pass", sanitized_text=text)

    if already_sanitized:
        return GuardrailResult(action="pass", sanitized_text=text)

    out = THINKING_TAG.sub("", text).strip()
    flags: list[str] = []
    severity = "low"

    if _matches_any(out, _PROHIBITED_OUTPUT):
        return GuardrailResult(
            allowed=False,
            action="block",
            user_message=SAFE_FALLBACK,
            flags=["prohibited_output"],
            severity="high",
        )

    if chat_type == "institutional":
        if _matches_any(out, _PII_REQUEST_PATTERNS) or detect_sensitive_entities(out):
            entity_types = [e.entity_type for e in detect_sensitive_entities(out)]
            if entity_types or re.search(r"\b\d{1,3}\s+estudiantes\b", out, re.I):
                _log_guardrail("pii_exposure_attempt", "high", user_id, chat_type, ["pii_output"], entity_types)
                return GuardrailResult(
                    allowed=False,
                    action="block",
                    user_message=BLOCK_PII_INSTITUTIONAL,
                    flags=["pii_output"],
                    severity="high",
                )

    entities = detect_sensitive_entities(out) if chat_type != "privileged" else []
    if entities:
        out = redact_sensitive_text(out)
        flags.append("pii_output")
        severity = "high"
        _log_guardrail(
            "pii_exposure_attempt",
            "high",
            user_id,
            chat_type,
            flags,
            [e.entity_type for e in entities],
        )

    out = _sanitize_urls(out)

    max_out = settings.chat_max_output_chars
    if len(out) > max_out:
        out = out[:max_out].rsplit(" ", 1)[0] + "…"
        flags.append("truncated")

    if flags:
        return GuardrailResult(
            allowed=True,
            action="sanitize",
            sanitized_text=out,
            flags=flags,
            severity=severity,
        )

    return GuardrailResult(action="pass", sanitized_text=out)


def scrub_context_for_llm(messages: list[dict]) -> list[dict]:
    """Redact sensitive entities from user/assistant history before LLM."""
    if not settings.guardrails_enabled or not settings.guardrails_redact_input_pii:
        return messages
    scrubbed = []
    for msg in messages:
        m = dict(msg)
        if m.get("role") in ("user", "assistant") and m.get("content"):
            m["content"] = redact_sensitive_text(str(m["content"]))
        scrubbed.append(m)
    return scrubbed
