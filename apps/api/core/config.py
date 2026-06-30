"""Application settings."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    llm_model_tutor: str = "meta-llama/llama-3.2-3b-instruct:free"
    llm_model_director: str = "meta-llama/llama-3.2-3b-instruct:free"
    llm_model_path: str = "meta-llama/llama-3.2-3b-instruct:free"
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

    class Config:
        env_file = ".env"


settings = Settings()
