from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "FinOS MVP"
    API_V1_STR: str = "/api/v1"
    
    # Database (Standard PostgreSQL connection string - 100% portable)
    DATABASE_URL: str
    
    # JWT Authentication Secrets
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Flexible S3-Compatible Object Storage (Supabase, DigitalOcean Spaces, AWS S3, Cloudflare R2)
    S3_BUCKET_NAME: str = "finos-raw-vault"
    AWS_ACCESS_KEY_ID: str = "mock_key"
    AWS_SECRET_ACCESS_KEY: str = "mock_secret"
    AWS_REGION: str = "ap-south-1"
    
    # OPTIONAL: Custom endpoint for non-AWS S3 providers (Supabase, DigitalOcean, R2)
    # If using AWS S3, leave this blank (None). If using Supabase/DigitalOcean, put their URL here.
    S3_ENDPOINT_URL: str | None = None

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()