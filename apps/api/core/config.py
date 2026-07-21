"""Application settings."""
from pydantic_settings import BaseSettings


DEFAULT_OPENROUTER_FREE_MODELS = (
    "meta-llama/llama-3.2-3b-instruct:free,"
    "google/gemma-3-27b-it:free,"
    "qwen/qwen-2.5-7b-instruct:free,"
    "google/gemini-2.0-flash-exp:free,"
    "mistralai/mistral-7b-instruct:free"
)


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    llm_model_tutor: str = "meta-llama/llama-3.2-3b-instruct:free"
    llm_model_director: str = "meta-llama/llama-3.2-3b-instruct:free"
    llm_model_path: str = "meta-llama/llama-3.2-3b-instruct:free"
    # CSV of free OpenRouter model IDs tried in order (max llm_max_openrouter_attempts).
    llm_openrouter_free_models: str = DEFAULT_OPENROUTER_FREE_MODELS
    llm_max_openrouter_attempts: int = 5
    llm_provider: str = "openrouter"
    gemini_api_key: str = ""
    huggingface_api_key: str = ""
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


settings = Settings()
