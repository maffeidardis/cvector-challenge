"""Application configuration settings."""

import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    """Application settings."""
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    
    # Application
    app_name: str = os.getenv("APP_NAME", "Virtual Energy Trading API")
    version: str = os.getenv("VERSION", "1.0.0")
    debug: bool = os.getenv("DEBUG", "true").lower() == "true"
    

    # External APIs
    gridstatus_api_key: Optional[str] = os.getenv("GRIDSTATUS_API_KEY")
    
    # Market Data - PJM Focus
    primary_market: str = os.getenv("PRIMARY_MARKET", "PJM")  # Focus on PJM only
    
    # CORS - Use string type to avoid Pydantic JSON parsing
    cors_origins: str = "http://localhost:5173,http://localhost:3000,https://cvector.torportech.ai"
    
    def get_cors_origins(self) -> List[str]:
        """Get CORS origins as a list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


settings = Settings()
