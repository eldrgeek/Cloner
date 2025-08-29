from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # Application
    app_name: str = "Cloner"
    app_version: str = "0.1.0"
    debug: bool = True
    
    # Database
    database_url: str = "sqlite:///./cloner.db"
    
    # Security
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # AI Services
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    
    # External Services
    port: int = 8000
    host: str = "0.0.0.0"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()

# Production environment detection
def is_production():
    """Check if running in production environment"""
    # Multiple ways to detect production
    env_var = os.getenv("ENVIRONMENT", "").lower()
    render_service = os.getenv("RENDER_SERVICE_NAME")  # Render sets this automatically
    port = os.getenv("PORT", "")  # Render typically sets this to 10000
    
    # If we're on Render (RENDER_SERVICE_NAME exists) or PORT is 10000, assume production
    if render_service or port == "10000":
        return True
    
    # Fallback to ENVIRONMENT variable
    return env_var == "production"

# Update settings based on environment
if is_production():
    settings.debug = False
    settings.host = "0.0.0.0"
    # In production, use environment variables for sensitive data
    if os.getenv("SECRET_KEY"):
        settings.secret_key = os.getenv("SECRET_KEY")
    if os.getenv("DATABASE_URL"):
        settings.database_url = os.getenv("DATABASE_URL")