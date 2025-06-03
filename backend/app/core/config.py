# app/core/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List, Optional

class Settings(BaseSettings):
    app_name: str = "The_Blue_Maroon"
    env_type: str = "dev"
    version: str = "0.1.0"
    debug: bool = False
    allowed_hosts: List[str] = ["*"]

    # Security
    secret_key: str
    auth0_domain: str
    auth0_audience: str
    auth0_client_id: str
    auth0_client_secret: str
    auth0_m2m_client_id: str
    auth0_m2m_client_secret: str
    auth0_token_url: str = ""
    algorithms: List[str] = ["RS256"]
    auth0_siwe_connection: str = "siwe"
    auth0_allowed_chains: List[int]

    # Didit 
    didit_client_id: str
    didit_client_secret: str
    didit_api_key: str
    didit_webhook_secret: str
    didit_token_base_url: str
    didit_verify_base_url: str

    # DB
    database_url: Optional[str] = None
    neon_database_url: Optional[str] = None
    sync_database_url: Optional[str] = None

    class Config:
        env_file = ".env"
        extra = "allow"

    def get_db_url(self) -> str:
        if self.env_type == "dev" and self.neon_database_url:
            return self.neon_database_url
        return self.database_url


@lru_cache()
def get_settings() -> Settings:
    return Settings()
