from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    google_api_key: str
    gemini_chat_model: str
    gemini_flashcard_model: str
    gemini_embedding_model: str
    supabase_jwt_secret: str
    supabase_project_url: str
    supabase_jwks_url: str
    supabase_jwt_audience: str
    supabase_url: str
    supabase_service_role_key: str
    supabase_sources_bucket: str
    aws_region: str
    aws_s3_bucket: str
    aws_access_key_id: str
    aws_secret_access_key: str
    dev_auth_bypass: bool
    data_dir: Path
    database_path: Path
    cors_origins: list[str]


def get_settings() -> Settings:
    dev_auth_bypass = os.getenv("DEV_AUTH_BYPASS", "false").strip().lower() in {"1", "true", "yes", "on"}
    data_dir = Path(os.getenv("DATA_DIR", "./data")).resolve()
    db_path = Path(os.getenv("DATABASE_PATH", str(data_dir / "learnbot.db"))).resolve()
    origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
    return Settings(
        google_api_key=os.getenv("GOOGLE_API_KEY", ""),
        gemini_chat_model=os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-flash"),
        gemini_flashcard_model=os.getenv("GEMINI_FLASHCARD_MODEL", "gemini-2.5-flash"),
        gemini_embedding_model=os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001"),
        supabase_jwt_secret=os.getenv("SUPABASE_JWT_SECRET", ""),
        supabase_project_url=os.getenv("SUPABASE_PROJECT_URL", ""),
        supabase_jwks_url=os.getenv("SUPABASE_JWKS_URL", ""),
        supabase_jwt_audience=os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated"),
        supabase_url=os.getenv("SUPABASE_URL", ""),
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        supabase_sources_bucket=os.getenv("SUPABASE_SOURCES_BUCKET", "sources"),
        aws_region=os.getenv("AWS_REGION", ""),
        aws_s3_bucket=os.getenv("AWS_S3_BUCKET", ""),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID", ""),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY", ""),
        dev_auth_bypass=dev_auth_bypass,
        data_dir=data_dir,
        database_path=db_path,
        cors_origins=origins,
    )


settings = get_settings()
