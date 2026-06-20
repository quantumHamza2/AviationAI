"""
AeroMind Configuration — Pydantic Settings loaded from environment variables.
"""
from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    """Application settings loaded from .env file or environment variables."""

    # ---- App ----
    app_name: str = "AeroMind"
    app_version: str = "1.0.0"
    debug: bool = True
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000

    # ---- Database ----
    database_url: str = "postgresql+asyncpg://aeromind:aeromind_secret@localhost:5432/aeromind"
    database_url_sync: str = "postgresql://aeromind:aeromind_secret@localhost:5432/aeromind"

    # ---- Redis ----
    redis_url: str = "redis://localhost:6379/0"

    # ---- OpenSky Network ----
    opensky_client_id: str = ""
    opensky_client_secret: str = ""
    opensky_base_url: str = "https://opensky-network.org/api"
    opensky_auth_url: str = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token"
    opensky_poll_interval: int = 10  # seconds

    # ---- Aviation Weather Center ----
    awc_base_url: str = "https://aviationweather.gov/api/data"

    # ---- OpenWeatherMap ----
    openweather_api_key: str = ""
    openweather_base_url: str = "https://api.openweathermap.org/data/2.5"

    # ---- CORS ----
    cors_origins: str = '["http://localhost:3000","http://localhost:3001"]'

    # ---- ML Model ----
    model_path: str = "ml_models/trained"

    # ---- Frontend ----
    frontend_url: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from JSON string."""
        try:
            return json.loads(self.cors_origins)
        except (json.JSONDecodeError, TypeError):
            return ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()
