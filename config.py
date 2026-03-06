"""
Application configuration settings.
"""

from pydantic_settings import BaseSettings
from typing import Set


class Settings(BaseSettings):
    """
    Application settings and configuration.

    Uses pydantic for validation and environment variable support.
    """

    # App metadata
    app_title: str = "Multi-Tool Web Converter"
    app_version: str = "1.2.0"

    # Server settings
    host: str = "0.0.0.0"
    port: int = 8000
    reload: bool = True

    # CORS settings
    cors_origins: list = ["*"]
    cors_credentials: bool = True
    cors_methods: list = ["*"]
    cors_headers: list = ["*"]

    # File upload limits
    max_file_size: int = 50 * 1024 * 1024  # 50MB
    max_files_per_request: int = 100

    # Supported image formats
    supported_image_formats: Set[str] = {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/bmp",
        "image/tiff",
    }

    # Logging
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Global settings instance
settings = Settings()
