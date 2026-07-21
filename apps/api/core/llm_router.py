"""LangChain multi-provider LLM router (OpenRouter → Hugging Face) with LangSmith tracing."""
from __future__ import annotations

import asyncio
import logging
import os
import re
from typing import AsyncGenerator, Awaitable, Callable

import httpx
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from core.config import settings

logger = logging.getLogger(__name__)

FALLBACK_MESSAGE = (
    "Estoy en modo limitado por un momento, pero seguimos en la conversación. "
    "Puedes contarme cómo te sientes, pedir orientación académica o recursos de bienestar UTB, "
    "y te ayudo con lo que pueda. Si prefieres apoyo humano, usa «Prefiero hablar con una persona»."
)

DEMO_MESSAGE = (
    "Estoy disponible en modo demostración UTB. Puedo orientarte sobre acompañamiento estudiantil, "
    "bienestar y prevención de deserción mientras el servicio de IA completa la respuesta. "
    "Cuéntame en qué te puedo ayudar hoy."
)

HANDOFF_MESSAGE = (
    "No pude completar una respuesta automática en este momento. "
    "Te estoy conectando con el equipo de bienestar UTB para que un psicólogo continúe contigo en este mismo chat."
)

OPENROUTER_APP_TITLE = "UTB Te acompana"
LLM_HTTP_TIMEOUT_S = float(getattr(settings, "llm_http_timeout_s", 25.0) or 25.0)

THINKING_PROMPT = """Responde en español. Primero escribe tu razonamiento dentro de etiquetas <thinking>...</thinking>.
Luego escribe la respuesta final para el estudiante fuera de esas etiquetas."""

_httpx_client: httpx.AsyncClient | None = None
_langsmith_ready = False


def _ensure_langsmith() -> None:
    global _langsmith_ready
    if _langsmith_ready:
        return
    try:
        settings.configure_langsmith()
    except Exception as exc:
        logger.debug("LangSmith configure skipped: %s", exc)
    _langsmith_ready = True


def _get_httpx_client() -> httpx.AsyncClient:
    global _httpx_client
    if _httpx_client is None or _httpx_client.is_closed:
        _httpx_client = httpx.AsyncClient(timeout=LLM_HTTP_TIMEOUT_S)
    return _httpx_client


def _parse_thinking(text: str) -> tuple[str, str]:
    match = re.search(r"<thinking>(.*?)</thinking>", text, re.DOTALL | re.IGNORECASE)
    if match:
        reasoning = match.group(1).strip()
        answer = re.sub(r"<thinking>.*?</thinking>", "", text, flags=re.DOTALL | re.IGNORECASE).strip()
        return reasoning, answer
    return "", text.strip()


def _is_rate_limit_error(exc: BaseException) -> bool:
    status = getattr(exc, "status_code", None) or getattr(exc, "status", None)
    if status == 429:
        return True
    response = getattr(exc, "response", None)
    if response is not None and getattr(response, "status_code", None) == 429:
        return True
    msg = str(exc).lower()
    return "429" in msg or "rate limit" in msg or "rate_limit" in msg


def _to_lc_messages(messages: list[dict]):
    out = []
    for m in messages:
        role = m.get("role", "user")
        content = m.get("content") or ""
        if role == "system":
            out.append(SystemMessage(content=content))
        elif role == "assistant":
            out.append(AIMessage(content=content))
        else:
            out.append(HumanMessage(content=content))
    return out


def _openrouter_chat(model: str) -> ChatOpenAI:
    return ChatOpenAI(
        model=model,
        api_key=settings.openrouter_api_key or "missing",
        base_url=settings.openrouter_base_url,
        temperature=0.4,
        max_tokens=1024,
        timeout=LLM_HTTP_TIMEOUT_S,
        max_retries=0,
        default_headers={
            "HTTP-Referer": settings.app_url,
            "X-Title": OPENROUTER_APP_TITLE,
        },
    )


async def _openrouter_complete(messages: list[dict], model: str) -> str:
    """OpenRouter via LangChain ChatOpenAI (OpenAI-compatible)."""
    _ensure_langsmith()
    llm = _openrouter_chat(model)
    result = await llm.ainvoke(_to_lc_messages(messages))
    content = result.content
    if isinstance(content, list):
        return "".join(str(p) for p in content)
    return str(content or "")


async def _huggingface_complete(messages: list[dict]) -> str:
    """Hugging Face Inference API fallback (traced as LangChain runnable when possible)."""
    if not settings.huggingface_api_key:
        raise RuntimeError("no hf key")
    _ensure_langsmith()
    prompt = "\n".join(f"{m['role']}: {m['content']}" for m in messages)
    model = settings.huggingface_model or "HuggingFaceH4/zephyr-7b-beta"
    client = _get_httpx_client()
    res = await client.post(
        f"https://api-inference.huggingface.co/models/{model}",
        headers={"Authorization": f"Bearer {settings.huggingface_api_key}"},
        json={"inputs": prompt, "parameters": {"max_new_tokens": 512, "return_full_text": False}},
    )
    res.raise_for_status()
    data = res.json()
    if isinstance(data, list) and data:
        return data[0].get("generated_text", "")
    if isinstance(data, dict) and "generated_text" in data:
        return str(data["generated_text"])
    return str(data)


def _apply_output_guardrails(answer: str, chat_type: str | None, user_id: str | None) -> str:
    if not (settings.guardrails_enabled and chat_type):
        return answer
    from services.llm_guardrails import check_output
    out = check_output(answer, chat_type, user_id=user_id)  # type: ignore[arg-type]
    if not out.allowed and out.user_message:
        return out.user_message
    if out.sanitized_text:
        return out.sanitized_text
    return answer


def _build_provider_fns(
    enriched: list[dict],
    primary: str,
) -> list[tuple[str, Callable[[], Awaitable[str]]]]:
    providers: list[tuple[str, Callable[[], Awaitable[str]]]] = []
    order = settings.provider_order_list() or ["openrouter", "huggingface"]

    for provider in order:
        if provider == "openrouter" and settings.openrouter_api_key:
            for or_model in settings.openrouter_model_chain(primary):
                providers.append((
                    f"openrouter:{or_model}",
                    lambda m=enriched, mod=or_model: _openrouter_complete(m, mod),
                ))
        elif provider == "huggingface" and settings.huggingface_api_key:
            providers.append(("huggingface", lambda m=enriched: _huggingface_complete(m)))
    return providers


async def complete_with_fallback(
    messages: list[dict],
    model: str | None = None,
    *,
    skip_thinking: bool = False,
    fallback: Callable[[], str] | None = None,
    chat_type: str | None = None,
    user_id: str | None = None,
    escalate_on_failure: bool = False,
    metadata: dict | None = None,
) -> tuple[str, str, str]:
    """Returns (reasoning, answer, provider_used) via LangChain provider cascade."""
    _ensure_langsmith()
    if metadata:
        # Attach run metadata for LangSmith when tracing is on
        os.environ.setdefault("LANGCHAIN_PROJECT", settings.langchain_project or "utb-te-acompana")

    primary = model or settings.llm_model_tutor
    enriched = messages.copy()
    if not skip_thinking:
        if enriched and enriched[0]["role"] == "system":
            enriched[0] = {"role": "system", "content": enriched[0]["content"] + "\n\n" + THINKING_PROMPT}
        else:
            enriched.insert(0, {"role": "system", "content": THINKING_PROMPT})

    providers = _build_provider_fns(enriched, primary)

    def _failure_result() -> tuple[str, str, str]:
        if escalate_on_failure or fallback:
            answer = fallback() if fallback else HANDOFF_MESSAGE
            return "", answer, "counselor"
        return "", FALLBACK_MESSAGE, "failed"

    try:
        if not providers:
            if escalate_on_failure or fallback:
                return "", (fallback() if fallback else HANDOFF_MESSAGE), "counselor"
            return "", DEMO_MESSAGE, "demo"

        for name, fn in providers:
            try:
                raw = await asyncio.wait_for(fn(), timeout=LLM_HTTP_TIMEOUT_S)
                reasoning, answer = _parse_thinking(raw)
                if answer:
                    answer = _apply_output_guardrails(answer, chat_type, user_id)
                    provider_label = name.split(":", 1)[0]
                    return reasoning, answer, provider_label
                logger.warning("LLM provider %s returned an empty answer", name)
            except Exception as exc:
                if _is_rate_limit_error(exc):
                    logger.warning("LLM provider %s rate-limited; trying next model: %s", name, exc)
                else:
                    logger.warning("LLM provider %s failed: %s", name, exc)

        logger.error(
            "All LLM providers failed (%s tried); escalate=%s",
            ", ".join(name for name, _ in providers) or "none",
            escalate_on_failure,
        )
        return _failure_result()
    except Exception as exc:
        logger.error("complete_with_fallback unexpected error: %s", exc)
        return _failure_result()


def _chunk_text(text: str, chunk_size: int = 48) -> list[str]:
    return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]


async def stream_with_fallback(
    messages: list[dict],
    model: str | None = None,
    *,
    skip_thinking: bool = False,
    fallback: Callable[[], str] | None = None,
    chat_type: str | None = None,
    user_id: str | None = None,
    escalate_on_failure: bool = False,
    metadata: dict | None = None,
) -> AsyncGenerator[dict, None]:
    """Yields dicts: {type: thinking|reasoning|token|done|error, content/message}."""
    yield {"type": "thinking", "message": "Analizando tu pregunta y buscando contexto…"}

    reasoning, answer, provider = await complete_with_fallback(
        messages, model, skip_thinking=skip_thinking, fallback=fallback,
        chat_type=chat_type, user_id=user_id, escalate_on_failure=escalate_on_failure,
        metadata=metadata,
    )

    if reasoning:
        yield {"type": "reasoning", "content": reasoning}

    if provider == "counselor":
        answer = answer or HANDOFF_MESSAGE
        for chunk in _chunk_text(answer):
            yield {"type": "token", "content": chunk}
        yield {"type": "done", "content": answer, "counselor": True, "provider": provider}
        return

    if not (answer or "").strip():
        if escalate_on_failure:
            answer = HANDOFF_MESSAGE
            for chunk in _chunk_text(answer):
                yield {"type": "token", "content": chunk}
            yield {"type": "done", "content": answer, "counselor": True, "provider": "counselor"}
            return
        answer = FALLBACK_MESSAGE
        provider = "failed"

    yield {"type": "thinking", "message": "Generando respuesta…"}
    for chunk in _chunk_text(answer):
        yield {"type": "token", "content": chunk}
    yield {"type": "done", "content": answer, "provider": provider, "degraded": provider in ("demo", "failed")}
