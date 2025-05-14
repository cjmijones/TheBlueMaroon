from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List

class Settings(BaseSettings):
    app_name: str = "The Blue Maroon"
    env_type: str = "dev"
    version: str = "0.1.0"
    debug: bool = False
    allowed_hosts: List[str] = ["*"]

    # Security
    secret_key: str
    database_url: str    
    auth0_domain: str
    auth0_audience: str
    auth0_client_id: str
    auth0_client_secret: str  # 🔐 required to exchange refresh_token
    auth0_token_url: str = ""
    algorithms: List[str] = ["RS256"]

    auth0_siwe_connection: str = "siwe"
    auth0_allowed_chains: List[int]

    # DB
    database_url: str
    sync_database_url: str

    class Config:
        env_file = ".env"
        extra = 'allow'


@lru_cache()
def get_settings() -> Settings:
    return Settings()
