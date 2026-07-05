"""OpenRouter / LLM client — delegates to llm_router."""
from core.llm_router import complete_with_fallback, stream_with_fallback, FALLBACK_MESSAGE

async def stream_chat(messages: list[dict], model: str | None = None, *, skip_thinking: bool = False) -> str:
    _reasoning, answer, _provider = await complete_with_fallback(messages, model, skip_thinking=skip_thinking)
    return answer


async def stream_chat_generator(messages: list[dict], model: str | None = None, *, skip_thinking: bool = False):
    async for event in stream_with_fallback(messages, model, skip_thinking=skip_thinking):
        if event["type"] == "token":
            yield event.get("content", "")
