"""
Configuration settings for NIAT AI Admission Copilot.
Loads settings from environment variables or .env file.
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    
    APP_NAME: str = "NIAT AI Admission Copilot"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # AI Provider Settings (Dual Engine: Groq + Gemini)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.8-flash"
    
    # JWT Authentication Settings
    JWT_SECRET_KEY: str = "niat_copilot_jwt_secret_key_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days auto-login persistence
    
    # Database Settings
    DATABASE_URL: str = "sqlite+aiosqlite:///niat_copilot.db"
    SUPABASE_URL: str = "https://tdqtkizcllciatcbmgqx.supabase.co"
    SUPABASE_KEY: str = ""

    # Multi-Component Automation Engine Providers
    MESSAGING_MODE: str = "mock"  # "live" | "mock"
    WHATSAPP_PROVIDER: str = "meta"  # "meta" | "twilio" | "mock"
    META_WHATSAPP_TOKEN: str = ""
    META_PHONE_NUMBER_ID: str = ""
    META_VERIFY_TOKEN: str = "niat_copilot_webhook_verify_secret_token"
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_NUMBER: str = ""

    VOICE_MODE: str = "mock"  # "live" | "mock"
    VOICE_PROVIDER: str = "vapi"  # "vapi" | "mock"
    VAPI_API_KEY: str = ""
    VAPI_PHONE_NUMBER_ID: str = ""
    VAPI_ASSISTANT_ID: str = ""
    
    # CORS Settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]

settings = Settings()
