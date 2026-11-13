import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # API Keys
    GROQ_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    # Application Configuration
    APP_ENV: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Rate Limiting & Safety
    RATE_LIMIT_PER_MINUTE: str = "20/minute"
    GLOBAL_DAILY_LIMIT: int = 1000
    MAX_AUDIO_SIZE_MB: int = 10
    MAX_MESSAGE_HISTORY: int = 6
    MAX_TOKENS: int = 160
    TEMPERATURE: float = 0.7

    # Models
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROQ_MODEL: str = "openai/gpt-oss-20b"
    GROQ_WHISPER_MODEL: str = "whisper-large-v3-turbo"
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # Voice / Audio
    TTS_VOICE: str = "en-US-ChristopherNeural"
    PREWARM_AUDIO_CACHE: bool = False

    # Static files directory (if frontend is built)
    STATIC_DIR: str = str(Path(__file__).resolve().parent.parent.parent / "frontend" / "dist")

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
