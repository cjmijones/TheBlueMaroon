# app/core/addressesettings.py
from functools import lru_cache
from app.core.config import get_settings

@lru_cache
def CHAINS() -> dict[int, dict]:
    settings = get_settings()
    return {
        11155111: {
            "name":       "sepolia",
            "nft":        settings.nft_sepolia_address,
            "factory":    settings.factory_sepolia_address,
            "vault_impl": settings.vault_impl_sepolia,
            "alchemy":    settings.alchemy_eth_sepolia_url,
        },
        1: {
            "name":       "mainnet",
            "nft":        settings.nft_mainnet_address,
            "factory":    settings.factory_mainnet_address,
            "vault_impl": settings.vault_impl_mainnet,
            "alchemy":    settings.alchemy_eth_mainnet_url,
        },
    }
