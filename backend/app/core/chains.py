from functools import lru_cache
from app.core.config import get_settings


@lru_cache
def CHAINS() -> dict[int, dict]:
    settings = get_settings()
    return {
        # ─────────── Sepolia ───────────
        11155111: {
            "name":  "sepolia",
            "rpc":   settings.alchemy_eth_sepolia_url,
            "native_symbol": "ETH",

            # NEW ➜ contract addresses pulled from .env
            "nft":      settings.nft_sepolia_address,
            "factory":  settings.factory_sepolia_address,
            "vault_impl": settings.vault_impl_sepolia,

            "tokens": {
                "USDC": "0x2326AF4Aa0eDa50e4A1d9d09ebEbad211A51E63e",
            },
        },

        # ─────────── Mainnet ───────────
        1: {
            "name":  "mainnet",
            "rpc":   settings.alchemy_eth_mainnet_url,
            "native_symbol": "ETH",

            "nft":      settings.nft_mainnet_address,
            "factory":  settings.factory_mainnet_address,
            "vault_impl": settings.vault_impl_mainnet,

            "tokens": {
                "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            },
        },

        # Add Polygon, Base, etc. the same way
    }
