from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "FinOS Financial Verification API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Safe production and local fallbacks to prevent Pydantic startup validation errors
    DATABASE_URL: str = "postgresql+asyncpg://finos_user:ZzleiDMMS6CW9LitQ4MsOy85L4UTouEE@dpg-dbd3qjjl550s73ahlppg-a.oregon-postgres.render.com/finos_db_tpdm"
    SECRET_KEY: str = "ae3e891abd55283f8af525e6dcd8580d5ba3469bd952e9d01cc22bb5421667f3"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
