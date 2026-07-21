"""Application settings."""
from pydantic_settings import BaseSettings


DEFAULT_OPENROUTER_FREE_MODELS = (
    "google/gemma-4-31b-it:free,"
    "openai/gpt-oss-20b:free,"
    "nvidia/nemotron-nano-9b-v2:free,"
    "google/gemma-4-26b-a4b-it:free,"
    "openrouter/free"
)


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    llm_model_tutor: str = "google/gemma-4-31b-it:free"
    llm_model_director: str = "google/gemma-4-31b-it:free"
    llm_model_path: str = "openai/gpt-oss-20b:free"
    # CSV of free OpenRouter model IDs tried in order (max llm_max_openrouter_attempts).
    llm_openrouter_free_models: str = DEFAULT_OPENROUTER_FREE_MODELS
    llm_max_openrouter_attempts: int = 5
    llm_provider: str = "openrouter"
    # CSV order for LangChain provider cascade (openrouter, huggingface, gemini).
    llm_provider_order: str = "openrouter,huggingface,gemini"
    gemini_api_key: str = ""
    llm_model_gemini: str = "gemini-2.0-flash"
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai/"
    huggingface_api_key: str = ""
    huggingface_model: str = "HuggingFaceH4/zephyr-7b-beta"
    litellm_api_base: str = ""
    litellm_api_key: str = ""
    youtube_api_key: str = ""
    scraper_enabled: bool = True
    cron_secret: str = ""
    allowed_origins: str = "http://localhost:3000"
    app_url: str = "http://localhost:3000"
    internal_register_key: str = ""
    psychologist_email: str = "psicologo@utb.edu.co"
    guardrails_enabled: bool = True
    chat_max_input_chars: int = 2000
    chat_max_output_chars: int = 800
    chat_rate_limit_per_minute: int = 30
    guardrails_redact_input_pii: bool = True
    guardrails_block_third_party_pii: bool = True
    # LangSmith / LangChain tracing
    langchain_tracing_v2: bool = False
    langchain_api_key: str = ""
    langchain_project: str = "utb-te-acompana"
    # Per-attempt timeout; keep low so OpenRouter free cascade + Gemini fit under proxy 60s.
    llm_http_timeout_s: float = 15.0
    llm_gemini_timeout_s: float = 20.0
    llm_transient_retries: int = 1
    llm_retry_backoff_s: float = 0.8

    class Config:
        env_file = ".env"
        extra = "ignore"

    def openrouter_model_chain(self, primary: str | None = None) -> list[str]:
        """Ordered unique OpenRouter models, capped at llm_max_openrouter_attempts."""
        primary = (primary or self.llm_model_tutor or "").strip()
        from_env = [
            m.strip()
            for m in (self.llm_openrouter_free_models or "").split(",")
            if m.strip()
        ]
        ordered: list[str] = []
        seen: set[str] = set()
        for model in ([primary] if primary else []) + from_env:
            if model and model not in seen:
                seen.add(model)
                ordered.append(model)
        max_n = max(1, int(self.llm_max_openrouter_attempts or 5))
        return ordered[:max_n]

    def provider_order_list(self) -> list[str]:
        return [
            p.strip().lower()
            for p in (self.llm_provider_order or "openrouter,huggingface,gemini").split(",")
            if p.strip()
        ]

    def configure_langsmith(self) -> None:
        """Enable LangSmith tracing when API key is present."""
        import os
        if self.langchain_api_key:
            os.environ.setdefault("LANGCHAIN_API_KEY", self.langchain_api_key)
        if self.langchain_tracing_v2 and self.langchain_api_key:
            os.environ["LANGCHAIN_TRACING_V2"] = "true"
            os.environ.setdefault("LANGCHAIN_PROJECT", self.langchain_project or "utb-te-acompana")
        elif not self.langchain_tracing_v2:
            os.environ.setdefault("LANGCHAIN_TRACING_V2", "false")


settings = Settings()
