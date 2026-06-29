"""Director of AI agent — institutional insights."""
from core.llm import stream_chat
from core.config import settings


async def get_director_insights(kpis: list[dict]) -> str:
    kpi_text = "\n".join(
        f"- {k['metric_name']}: {k['metric_value']} {k.get('metric_unit', '')} ({k.get('period', '')})"
        for k in kpis
    )

    messages = [
        {
            "role": "system",
            "content": "Eres el Director de IA institucional. Analiza KPIs y da recomendaciones ejecutivas concisas en español.",
        },
        {
            "role": "user",
            "content": f"KPIs actuales:\n{kpi_text}\n\nResume el estado institucional y 3 recomendaciones.",
        },
    ]

    return await stream_chat(messages, model=settings.llm_model_director)
