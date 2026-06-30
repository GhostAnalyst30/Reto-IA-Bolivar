"""OpenRouter / LLM client — delegates to llm_router."""
from core.llm_router import complete_with_fallback, stream_with_fallback, FALLBACK_MESSAGE

async def stream_chat(messages: list[dict], model: str | None = None) -> str:
    _reasoning, answer, _provider = await complete_with_fallback(messages, model)
    return answer


async def stream_chat_generator(messages: list[dict], model: str | None = None):
    async for event in stream_with_fallback(messages, model):
        if event["type"] == "token":
            yield event.get("content", "")
