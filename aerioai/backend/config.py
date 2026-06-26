from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "AERIOAI Mission Intelligence Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite:///./aerioai.db"

    # Security
    JWT_SECRET_KEY: str = "change-this-to-a-random-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440

    # Camera
    CAMERA_SOURCE: str = "mock"  # webcam | csi | mock
    CAMERA_WIDTH: int = 640
    CAMERA_HEIGHT: int = 480
    CAMERA_FPS: int = 30

    # Flight Controller
    FC_MODE: str = "mock"  # mock | msp
    FC_PORT: str = "/dev/ttyUSB0"
    FC_BAUDRATE: int = 115200

    # AI APIs
    GEMINI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    ELEVENLABS_API_KEY: Optional[str] = None
    KIMI_API_KEY: Optional[str] = None
    COSMOS_API_KEY: Optional[str] = None

    @field_validator("GEMINI_API_KEY", "GROQ_API_KEY", "ELEVENLABS_API_KEY", "KIMI_API_KEY", "COSMOS_API_KEY", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

    # Storage
    MEDIA_PATH: str = "../media"
    MAX_STORAGE_PERCENT: int = 85
    CLEANUP_PERCENT: int = 95

    # Server
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
