from fastapi import APIRouter, Depends, HTTPException, Path, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import logging

from app.schemas.fractional import FractionalCreate, FractionalFinalize
from app.core.addresses     import CHAINS
from app.auth.deps          import get_current_user, get_db

log     = logging.getLogger("api.fractional")
router  = APIRouter(prefix="/fractional", tags=["fractional"])


# ─────────────────────────────── draft (POST) ────────────────────────────────
@router.post("/", status_code=201)
async def create_fractional_listing(
    payload: FractionalCreate,
    db:      AsyncSession = Depends(get_db),
    user                  = Depends(get_current_user),
):
    log.info("🆗 stage-1  payload received %s", payload.model_dump())

    cfg = CHAINS().get(payload.chain_id)
    if not cfg or not cfg["factory"]:
        raise HTTPException(400, "Unsupported chain or missing factory address")

    # NB: we do **not** store the predicted vault address;
    #     it will be written later in the PATCH step.
    await db.execute(
        text(
            """
            INSERT INTO fractional_listings
              (creator_id, vault, nft_contract, token_id, shares,
               chain_id, round_price, created_at, expires_at)
            VALUES
              (:creator_id, NULL, :nft, :token, :shares,
               :chain, :price, NOW(), NOW() + INTERVAL '7 days')
            """
        ),
        {
            "creator_id": user.id,
            "nft":        payload.nft_contract.lower(),
            "token":      payload.token_id,
            "shares":     payload.shares,
            "chain":      payload.chain_id,
            "price":      payload.round_price,
        },
    )
    await db.commit()
    log.info("✅ draft created for %s #%s by %s",
             payload.nft_contract, payload.token_id, user.id)
    return {"status": "draft_created"}


# ─────────────────────────────── finalize (PATCH) ─────────────────────────────
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
    body:  FractionalFinalize = Body(...),
    db:    AsyncSession       = Depends(get_db),
    user                       = Depends(get_current_user),
):
    """
    *Only the original creator* may finalise their own draft.  
    If the row is already finalised we return **409 Conflict**.
    """
    # 1️⃣  locate **one** open draft (no vault yet) by this user
    draft_row = await db.execute(
        text(
            """
            SELECT id, vault
            FROM   fractional_listings
            WHERE  creator_id = :creator
              AND  vault IS NULL
            ORDER  BY created_at DESC
            LIMIT  1
            """
        ),
        {"creator": user.id},
    )
    draft = draft_row.first()

    if not draft:
        raise HTTPException(404, "Draft listing not found")

    if draft.vault is not None:
        raise HTTPException(409, "Listing already finalised")

    # 2️⃣  update the row with on-chain data
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
            "vault": vault.lower(),
            "tx":    body.tx_hash.lower(),
            "id":    draft.id,
        },
    )
    await db.commit()

    log.info("🏁 listing %s finalised by %s (vault %s)", draft.id, user.id, vault)
    return {"status": "active", "vault": vault}
