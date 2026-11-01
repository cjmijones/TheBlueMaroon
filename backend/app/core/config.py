from functools import lru_cache
from typing import List, Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "The_Blue_Maroon"
    env_type: str = "dev"
    version: str = "0.1.0"
    debug: bool = False
    allowed_hosts: List[str] = ["*"]

    public_base_url: str | None = "http://localhost:8000"
    media_root: str = "media"
    nft_max_image_bytes: int = 10 * 1024 * 1024
    nft_allowed_image_types: List[str] = ["image/png", "image/jpeg", "image/webp", "image/gif"]

    supabase_url: str | None = None
    supabase_jwks_url: str | None = None
    supabase_jwt_secret: str | None = None
    supabase_jwt_issuer: str | None = None
    supabase_jwt_audience: str = "authenticated"
    supabase_jwt_algorithms: List[str] = ["RS256", "ES256"]

    didit_client_id: str
    didit_client_secret: str
    didit_api_key: str
    didit_webhook_secret: str
    didit_token_base_url: str
    didit_verify_base_url: str

    database_url: Optional[str] = None
    neon_database_url: Optional[str] = None
    sync_database_url: Optional[str] = None

    alchemy_api_key: str
    alchemy_eth_sepolia_url: str
    alchemy_eth_mainnet_url: str
    alchemy_shape_sepolia_url: str
    alchemy_shape_mainnet_url: str

    nft_sepolia_address: str | None = None
    factory_sepolia_address: str | None = None
    vault_impl_sepolia: str | None = None

    nft_mainnet_address: str | None = None
    factory_mainnet_address: str | None = None
    vault_impl_mainnet: str | None = None

    class Config:
        env_file = ".env"
        extra = "allow"

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug(cls, value):
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "prod", "production"}:
                return False
            if normalized in {"debug", "dev", "development"}:
                return True
        return value

    def get_db_url(self) -> str:
        if self.env_type == "dev" and self.neon_database_url:
            return self.neon_database_url
        return self.database_url


@lru_cache()
def get_settings() -> Settings:
    return Settings()
