"""OpenRouter / LLM client."""
from openai import AsyncOpenAI
from core.config import settings

_client: AsyncOpenAI | None = None


def get_llm_client() -> AsyncOpenAI | None:
    global _client
    if not settings.openrouter_api_key:
        return None
    if _client is None:
        _client = AsyncOpenAI(
            base_url=settings.openrouter_base_url,
            api_key=settings.openrouter_api_key,
            default_headers={
                "HTTP-Referer": settings.app_url,
                "X-Title": "Reto IA Bolivar",
            },
        )
    return _client


def _demo_response(messages: list[dict]) -> str:
    last = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
    return (
        f"[Modo demo — configure OPENROUTER_API_KEY]\n\n"
        f"Entiendo tu pregunta sobre: \"{last[:200]}\". "
        f"Como tutor IA institucional, te recomiendo revisar los recursos "
        f"del buscador y crear una ruta de aprendizaje personalizada."
    )


async def stream_chat(messages: list[dict], model: str | None = None) -> str:
    """Non-streaming completion with error handling."""
    client = get_llm_client()
    model = model or settings.llm_model_tutor

    if not client:
        return _demo_response(messages)

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            stream=False,
            max_tokens=1024,
        )
        return response.choices[0].message.content or ""
    except Exception as exc:
        return f"[Error del modelo IA: {exc}]"


async def stream_chat_generator(messages: list[dict], model: str | None = None):
    """SSE token generator with error handling."""
    client = get_llm_client()
    model = model or settings.llm_model_tutor

    if not client:
        text = await stream_chat(messages, model)
        for word in text.split(" "):
            yield word + " "
        return

    try:
        stream = await client.chat.completions.create(
            model=model,
            messages=messages,
            stream=True,
            max_tokens=1024,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
    except Exception as exc:
        yield f"[Error del modelo IA: {exc}]"
