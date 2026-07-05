"""Multi-provider LLM router with fallback chain."""
import asyncio
import logging
import re
from typing import AsyncGenerator, Awaitable, Callable

import httpx
from openai import AsyncOpenAI

from core.config import settings

logger = logging.getLogger(__name__)

FALLBACK_MESSAGE = "Lo siento, el servidor no funciona"

# ASCII-only: httpx on Windows rejects non-ASCII values in HTTP headers (e.g. ñ in X-Title).
OPENROUTER_APP_TITLE = "UTB Te acompana"

THINKING_PROMPT = """Responde en español. Primero escribe tu razonamiento dentro de etiquetas <thinking>...</thinking>.
Luego escribe la respuesta final para el estudiante fuera de esas etiquetas."""

GEMINI_MODELS = ("gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b")

_openrouter_client: AsyncOpenAI | None = None
_litellm_client: AsyncOpenAI | None = None
_httpx_client: httpx.AsyncClient | None = None


def _get_openrouter_client() -> AsyncOpenAI:
    global _openrouter_client
    if _openrouter_client is None:
        _openrouter_client = AsyncOpenAI(
            base_url=settings.openrouter_base_url,
            api_key=settings.openrouter_api_key,
            default_headers={"HTTP-Referer": settings.app_url, "X-Title": OPENROUTER_APP_TITLE},
        )
    return _openrouter_client


def _get_litellm_client() -> AsyncOpenAI:
    global _litellm_client
    if _litellm_client is None:
        _litellm_client = AsyncOpenAI(
            base_url=settings.litellm_api_base,
            api_key=settings.litellm_api_key or "sk-local",
        )
    return _litellm_client


def _get_httpx_client() -> httpx.AsyncClient:
    global _httpx_client
    if _httpx_client is None or _httpx_client.is_closed:
        _httpx_client = httpx.AsyncClient(timeout=60)
    return _httpx_client


def _parse_thinking(text: str) -> tuple[str, str]:
    match = re.search(r"<thinking>(.*?)</thinking>", text, re.DOTALL | re.IGNORECASE)
    if match:
        reasoning = match.group(1).strip()
        answer = re.sub(r"<thinking>.*?</thinking>", "", text, flags=re.DOTALL | re.IGNORECASE).strip()
        return reasoning, answer
    return "", text.strip()


async def _openrouter_complete(messages: list[dict], model: str) -> str:
    client = _get_openrouter_client()
    response = await client.chat.completions.create(
        model=model, messages=messages, stream=False, max_tokens=1024,
    )
    return response.choices[0].message.content or ""


async def _gemini_complete(messages: list[dict]) -> str:
    if not settings.gemini_api_key:
        raise RuntimeError("no gemini key")
    system = next((m["content"] for m in messages if m["role"] == "system"), "")
    user_parts = [m["content"] for m in messages if m["role"] in ("user", "assistant")]
    prompt = f"{system}\n\n" + "\n".join(user_parts) if system else "\n".join(user_parts)
    client = _get_httpx_client()
    last_error: Exception | None = None
    for model in GEMINI_MODELS:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}"
            f":generateContent?key={settings.gemini_api_key}"
        )
        try:
            res = await client.post(url, json={"contents": [{"parts": [{"text": prompt}]}]})
            res.raise_for_status()
            data = res.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as exc:
            last_error = exc
            logger.warning("Gemini model %s failed: %s", model, exc)
    raise RuntimeError(f"all gemini models failed: {last_error}")


async def _huggingface_complete(messages: list[dict]) -> str:
    if not settings.huggingface_api_key:
        raise RuntimeError("no hf key")
    prompt = "\n".join(f"{m['role']}: {m['content']}" for m in messages)
    client = _get_httpx_client()
    res = await client.post(
        "https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta",
        headers={"Authorization": f"Bearer {settings.huggingface_api_key}"},
        json={"inputs": prompt, "parameters": {"max_new_tokens": 512, "return_full_text": False}},
    )
    res.raise_for_status()
    data = res.json()
    if isinstance(data, list) and data:
        return data[0].get("generated_text", "")
    return str(data)


async def _litellm_complete(messages: list[dict]) -> str:
    if not settings.litellm_api_base:
        raise RuntimeError("no litellm")
    client = _get_litellm_client()
    response = await client.chat.completions.create(
        model="meta-llama/llama-3.2-3b-instruct:free",
        messages=messages, stream=False, max_tokens=1024,
    )
    return response.choices[0].message.content or ""


async def complete_with_fallback(
    messages: list[dict],
    model: str | None = None,
    *,
    skip_thinking: bool = False,
) -> tuple[str, str, str]:
    """Returns (reasoning, answer, provider_used). On total failure answer = FALLBACK_MESSAGE."""
    model = model or settings.llm_model_tutor
    enriched = messages.copy()
    if not skip_thinking:
        if enriched and enriched[0]["role"] == "system":
            enriched[0] = {"role": "system", "content": enriched[0]["content"] + "\n\n" + THINKING_PROMPT}
        else:
            enriched.insert(0, {"role": "system", "content": THINKING_PROMPT})

    providers: list[tuple[str, Callable[[], Awaitable[str]]]] = []
    if settings.openrouter_api_key:
        for _ in range(3):
            providers.append(("openrouter", lambda m=enriched, mod=model: _openrouter_complete(m, mod)))
    if settings.gemini_api_key:
        providers.append(("gemini", lambda m=enriched: _gemini_complete(m)))
    if settings.huggingface_api_key:
        providers.append(("huggingface", lambda m=enriched: _huggingface_complete(m)))
    if settings.litellm_api_base:
        providers.append(("litellm", lambda m=enriched: _litellm_complete(m)))

    if not providers:
        demo = "Entiendo tu consulta. Configure las API keys para respuestas completas del tutor IA institucional UTB."
        return "", demo, "demo"

    for name, fn in providers:
        try:
            raw = await fn()
            reasoning, answer = _parse_thinking(raw)
            if answer:
                return reasoning, answer, name
            logger.warning("LLM provider %s returned an empty answer", name)
        except Exception as exc:
            logger.warning("LLM provider %s failed: %s", name, exc)
            await asyncio.sleep(0.5)

    logger.error(
        "All LLM providers failed (%s tried); returning fallback message",
        ", ".join(name for name, _ in providers) or "none",
    )
    return "", FALLBACK_MESSAGE, "failed"


def _chunk_text(text: str, chunk_size: int = 48) -> list[str]:
    """Split text into fixed-size chunks for faster SSE delivery."""
    return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]


async def stream_with_fallback(
    messages: list[dict],
    model: str | None = None,
    *,
    skip_thinking: bool = False,
) -> AsyncGenerator[dict, None]:
    """Yields dicts: {type: thinking|reasoning|token|done|error, content/message}."""
    yield {"type": "thinking", "message": "Analizando tu pregunta y buscando contexto…"}

    reasoning, answer, provider = await complete_with_fallback(messages, model, skip_thinking=skip_thinking)

    if reasoning:
        yield {"type": "reasoning", "content": reasoning}

    if provider == "failed":
        yield {"type": "token", "content": FALLBACK_MESSAGE}
        yield {"type": "done", "content": FALLBACK_MESSAGE}
        return

    yield {"type": "thinking", "message": "Generando respuesta…"}
    for chunk in _chunk_text(answer):
        yield {"type": "token", "content": chunk}
    yield {"type": "done", "content": answer}
