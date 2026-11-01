import logging

from fastapi import APIRouter, Body, Depends, HTTPException, Path
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.creator_actions import require_creator_action_ready, require_creator_kyc_ready
from app.auth.deps import get_current_user, get_db
from app.core.addresses import CHAINS
from app.models import Wallet
from app.schemas.fractional import FractionalCreate, FractionalFinalize

log = logging.getLogger("api.fractional")
router = APIRouter(prefix="/fractional", tags=["fractional"])


async def require_linked_wallet(
    db: AsyncSession,
    user_id: str,
    address: str,
) -> Wallet:
    result = await db.execute(
        select(Wallet).where(
            Wallet.user_id == user_id,
            Wallet.address == address.lower(),
        )
    )
    wallet = result.scalar_one_or_none()
    if not wallet:
        raise HTTPException(status_code=403, detail="Wallet is not linked to this account")
    return wallet


@router.post("/", status_code=201)
async def create_fractional_listing(
    payload: FractionalCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    log.info("stage-1 payload received %s", payload.model_dump())

    cfg = CHAINS().get(payload.chain_id)
    if not cfg or not cfg["factory"]:
        raise HTTPException(400, "Unsupported chain or missing factory address")
    await require_creator_action_ready(db, user.id, payload.creator_wallet_address)

    predicted_vault = payload.predicted_vault.lower()

    duplicate_row = await db.execute(
        text(
            """
            SELECT id, status
            FROM fractional_listings
            WHERE creator_id = :creator_id
              AND chain_id = :chain
              AND lower(nft_contract) = :nft
              AND token_id = :token
              AND (
                    lower(COALESCE(vault, '')) = :predicted_vault
                 OR lower(COALESCE(vault_salt, '')) = :predicted_vault
              )
            LIMIT 1
            """
        ),
        {
            "creator_id": user.id,
            "chain": payload.chain_id,
            "nft": payload.nft_contract.lower(),
            "token": payload.token_id,
            "predicted_vault": predicted_vault,
        },
    )
    if duplicate_row.first():
        raise HTTPException(
            status_code=409,
            detail="Fractional listing already exists for this predicted vault",
        )

    await db.execute(
        text(
            """
            INSERT INTO fractional_listings
              (creator_id, vault, vault_salt, nft_contract, token_id, shares,
               chain_id, round_price, status, created_at, expires_at, updated_at)
            VALUES
              (:creator_id, NULL, :predicted_vault, :nft, :token, :shares,
               :chain, :price, 'draft', NOW(), NOW() + INTERVAL '7 days', NOW())
            """
        ),
        {
            "creator_id": user.id,
            "predicted_vault": predicted_vault,
            "nft": payload.nft_contract.lower(),
            "token": payload.token_id,
            "shares": payload.shares,
            "chain": payload.chain_id,
            "price": payload.round_price,
        },
    )
    await db.commit()
    log.info("draft created for %s #%s by %s", payload.nft_contract, payload.token_id, user.id)
    return {"status": "draft_created", "predicted_vault": predicted_vault}


@router.patch(
    "/{vault}",
    status_code=200,
    summary="Finalize a draft once the on-chain vault is deployed",
)
async def finalize_fractional_listing(
    vault: str = Path(
        ...,
        pattern=r"^0x[a-fA-F0-9]{40}$",
        description="Deterministic address of the newly deployed vault",
    ),
    body: FractionalFinalize = Body(...),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    *Only the original creator* may finalise their own draft.
    If the row is already finalised we return **409 Conflict**.
    """
    await require_creator_kyc_ready(db, user.id)
    vault_address = vault.lower()

    active_row = await db.execute(
        text(
            """
            SELECT id, status
            FROM fractional_listings
            WHERE creator_id = :creator
              AND lower(COALESCE(vault, '')) = :vault
              AND COALESCE(status, 'draft') <> 'draft'
            LIMIT 1
            """
        ),
        {"creator": user.id, "vault": vault_address},
    )
    if active_row.first():
        raise HTTPException(409, "Listing already finalised")

    draft_row = await db.execute(
        text(
            """
            SELECT id, vault
            FROM fractional_listings
            WHERE creator_id = :creator
              AND vault IS NULL
              AND lower(COALESCE(vault_salt, '')) = :vault
              AND COALESCE(status, 'draft') = 'draft'
            LIMIT 1
            """
        ),
        {"creator": user.id, "vault": vault_address},
    )
    draft = draft_row.first()

    if not draft:
        raise HTTPException(404, "Draft listing not found")

    await db.execute(
        text(
            """
            UPDATE fractional_listings
            SET vault      = :vault,
                tx_hash    = :tx,
                status     = 'active',
                updated_at = NOW()
            WHERE id       = :id
            """
        ),
        {
            "vault": vault_address,
            "tx": body.tx_hash.lower(),
            "id": draft.id,
        },
    )
    await db.commit()

    log.info("listing %s finalised by %s (vault %s)", draft.id, user.id, vault_address)
    return {"status": "active", "vault": vault_address}
