import logging
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user, get_db
from app.core.addresses import CHAINS as ASSET_CHAINS
from app.core.chains import CHAINS
from app.crud.wallet import list_wallets
from app.models import AppAsset, User
from app.models.fractional_listing import FractionalListing
from app.services.alchemy import fetch_assets
from app.services.chain import get_erc20_balance, get_eth_balance

router = APIRouter(prefix="/portfolio", tags=["portfolio"])
log = logging.getLogger("api.portfolio")


def _serialize_datetime(value: Any) -> str | None:
    return value.isoformat() if value else None


def _decimal_to_string(value: Decimal | None) -> str | None:
    return str(value) if value is not None else None


async def _wallet_balances(address: str, chain_id: int) -> dict[str, Any]:
    native_wei = await get_eth_balance(address, chain_id)
    usdc = await get_erc20_balance(address, "USDC", chain_id)
    return {
        "native_wei": str(native_wei),
        "usdc": str(usdc),
    }


async def _wallet_assets(address: str, chain_id: int) -> list[dict[str, Any]]:
    cfg = ASSET_CHAINS().get(chain_id)
    if not cfg or not cfg.get("alchemy"):
        return []

    data = await fetch_assets(cfg["alchemy"], address, cursor=None, limit=24)
    return [
        {
            **item,
            "owner_address": address,
            "chain_id": chain_id,
            "chain_name": cfg.get("name"),
            "lifecycle": "owned_nft",
            "can_fractionalize": True,
        }
        for item in data.get("items", [])
    ]


@router.get("/me")
async def my_portfolio(
    connected_address: str | None = Query(None, description="Currently connected browser wallet address"),
    connected_chain_id: int | None = Query(None, description="Currently connected browser wallet chain ID"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    wallets = await list_wallets(db, user.id)
    chain_config = CHAINS()

    wallet_payloads: list[dict[str, Any]] = []
    owned_assets: list[dict[str, Any]] = []
    linked_addresses = {wallet.address.lower() for wallet in wallets}

    async def add_wallet_payload(
        address: str,
        chain_id: int,
        ens_name: str | None,
        is_primary: bool,
        linked_at: Any,
        is_linked: bool,
        is_connected: bool,
    ) -> None:
        chain = chain_config.get(chain_id, {})
        wallet_payload: dict[str, Any] = {
            "address": address,
            "chain_id": chain_id,
            "chain_name": chain.get("name", "unknown"),
            "native_symbol": chain.get("native_symbol", "ETH"),
            "ens_name": ens_name,
            "is_primary": is_primary,
            "is_linked": is_linked,
            "is_connected": is_connected,
            "linked_at": _serialize_datetime(linked_at),
            "balances": None,
            "errors": [],
        }

        try:
            wallet_payload["balances"] = await _wallet_balances(address, chain_id)
        except Exception as exc:
            log.warning("balance lookup failed wallet=%s chain=%s: %s", address, chain_id, exc)
            wallet_payload["errors"].append("balance_lookup_failed")

        try:
            owned_assets.extend(await _wallet_assets(address, chain_id))
        except Exception as exc:
            log.warning("asset lookup failed wallet=%s chain=%s: %s", address, chain_id, exc)
            wallet_payload["errors"].append("asset_lookup_failed")

        wallet_payloads.append(wallet_payload)

    connected_address_lower = connected_address.lower() if connected_address else None

    for wallet in wallets:
        chain_id = (
            connected_chain_id
            if connected_address_lower == wallet.address.lower() and connected_chain_id
            else wallet.chain_id or 11155111
        )
        await add_wallet_payload(
            address=wallet.address,
            chain_id=chain_id,
            ens_name=wallet.ens_name,
            is_primary=wallet.is_primary,
            linked_at=wallet.linked_at,
            is_linked=True,
            is_connected=connected_address_lower == wallet.address.lower(),
        )

    if connected_address_lower and connected_address_lower not in linked_addresses:
        await add_wallet_payload(
            address=connected_address_lower,
            chain_id=connected_chain_id or 11155111,
            ens_name=None,
            is_primary=False,
            linked_at=None,
            is_linked=False,
            is_connected=True,
        )

    app_assets_result = await db.execute(
        select(AppAsset)
        .where(AppAsset.creator_id == user.id)
        .order_by(AppAsset.created_at.desc())
    )
    app_assets = [
        {
            "id": f"app-{asset.id}",
            "source_id": asset.id,
            "title": asset.title,
            "description": asset.description,
            "metadata_uri": asset.metadata_uri,
            "image_url": asset.image_url,
            "nft_contract": asset.nft_contract,
            "token_id": asset.token_id,
            "chain_id": asset.chain_id,
            "vault": None,
            "shares": None,
            "round_price": None,
            "status": asset.status,
            "lifecycle": "minted_asset"
            if asset.status in {"mint_submitted", "minted"}
            else "metadata_asset",
            "tx_hash": asset.mint_tx_hash,
            "created_at": _serialize_datetime(asset.created_at),
            "expires_at": None,
            "updated_at": _serialize_datetime(asset.updated_at),
        }
        for asset in app_assets_result.scalars().all()
    ]

    listings_result = await db.execute(
        select(FractionalListing)
        .where(FractionalListing.creator_id == user.id)
        .order_by(FractionalListing.created_at.desc())
    )
    fractional_assets = [
        {
            "id": str(listing.id),
            "source_id": listing.id,
            "title": None,
            "description": None,
            "metadata_uri": None,
            "image_url": None,
            "nft_contract": listing.nft_contract,
            "token_id": str(listing.token_id),
            "chain_id": listing.chain_id,
            "vault": listing.vault,
            "shares": listing.shares,
            "round_price": _decimal_to_string(listing.round_price),
            "status": listing.status or ("active" if listing.vault else "draft"),
            "lifecycle": "fractionalized_asset" if listing.vault else "draft_asset",
            "tx_hash": listing.tx_hash,
            "created_at": _serialize_datetime(listing.created_at),
            "expires_at": _serialize_datetime(listing.expires_at),
            "updated_at": _serialize_datetime(listing.updated_at),
        }
        for listing in listings_result.scalars().all()
    ]
    created_assets = sorted(
        app_assets + fractional_assets,
        key=lambda asset: asset.get("updated_at") or asset.get("created_at") or "",
        reverse=True,
    )

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "picture": user.picture,
        },
        "wallets": wallet_payloads,
        "owned_assets": owned_assets,
        "created_assets": created_assets,
        "positions": [],
        "lifecycle_counts": {
            "owned_nfts": len(owned_assets),
            "app_assets": len(app_assets),
            "draft_assets": len(
                [
                    asset
                    for asset in created_assets
                    if asset["status"] in {"metadata_ready", "mint_submitted", "draft"}
                ]
            ),
            "minted_assets": len(
                [asset for asset in app_assets if asset["status"] in {"mint_submitted", "minted"}]
            ),
            "fractionalized_assets": len([asset for asset in created_assets if asset["status"] == "active"]),
            "positions": 0,
        },
    }
