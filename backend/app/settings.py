from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SUPABASE_JWT_SECRET: str
    SUPABASE_API_URL: str

    class Config:
        env_file = ".env"


settings = Settings()


