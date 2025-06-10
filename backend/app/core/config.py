from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List, Optional


class Settings(BaseSettings):
    # ───────────────────  App  ────────────────────
    app_name: str = "The_Blue_Maroon"
    env_type: str = "dev"
    version:  str = "0.1.0"
    debug:   bool = False
    allowed_hosts: List[str] = ["*"]

    # ──────────────────  Auth0  ───────────────────
    public_base_url: str | None = "http://localhost:8000"

    # ──────────────────  Auth0  ───────────────────
    secret_key: str
    auth0_domain: str
    auth0_audience: str
    auth0_client_id: str
    auth0_client_secret: str
    auth0_m2m_client_id: str
    auth0_m2m_client_secret: str
    auth0_sync_hmac: str
    auth0_token_url: str = ""
    algorithms: List[str] = ["RS256"]
    auth0_siwe_connection: str = "siwe"
    auth0_allowed_chains: List[int]

    # ──────────────────  Didit  ───────────────────
    didit_client_id: str
    didit_client_secret: str
    didit_api_key: str
    didit_webhook_secret: str
    didit_token_base_url: str
    didit_verify_base_url: str

    # ───────────────────  DB  ─────────────────────
    database_url: Optional[str] = None
    neon_database_url: Optional[str] = None
    sync_database_url: Optional[str] = None

    # ──────────────────  Alchemy  ─────────────────
    alchemy_api_key: str
    alchemy_eth_sepolia_url: str
    alchemy_eth_mainnet_url: str
    alchemy_shape_sepolia_url: str
    alchemy_shape_mainnet_url: str

    # ─────────────── Contract addresses ───────────
    # Sepolia
    nft_sepolia_address:      str | None = None
    factory_sepolia_address:  str | None = None
    vault_impl_sepolia:       str | None = None

    # Mainnet
    nft_mainnet_address:      str | None = None
    factory_mainnet_address:  str | None = None
    vault_impl_mainnet:       str | None = None

    class Config:
        env_file = ".env"
        extra = "allow"

    # Helper to choose neon vs prod
    def get_db_url(self) -> str:
        if self.env_type == "dev" and self.neon_database_url:
            return self.neon_database_url
        return self.database_url


@lru_cache()
def get_settings() -> Settings:     # singleton
    return Settings()
