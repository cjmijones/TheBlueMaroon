# app/api/routes_fractional.py
import re, logging, json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import insert
from app.auth.deps      import get_current_user, get_db
from app.models         import FractionalListing
from app.core.chains    import CHAINS

router = APIRouter(prefix="/fractional", tags=["fractional"])
log = logging.getLogger("fractional")

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
HEX_ADDRESS = re.compile(r"^0x[a-fA-F0-9]{40}$")


# ─────────────────────────────────────────────────────────────────────────────
# POST /fractional   – draft listing + constructor calldata
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/", status_code=status.HTTP_201_CREATED)
async def fractionalize(
    payload: dict,
    user:      str          = Depends(get_current_user),
    db: AsyncSession        = Depends(get_db),
):
    """
    ➊ Validates params  
    ➋ Persists a *draft* row (so UI can poll)  
    ➌ Returns constructor args (front-end still deploys via Factory)
    """
    nft      = payload.get("nft_contract", "").lower()
    token_id = int(payload.get("token_id", 0))
    shares   = int(payload.get("shares",   0))
    chain_id = int(payload.get("chain_id", 11155111))

    if chain_id not in CHAINS():
        raise HTTPException(400, "unsupported chain")

    if not HEX_ADDRESS.match(nft):
        raise HTTPException(400, "invalid nft address")

    # ── build deterministic vault address (optional UX helper) ───────────
    factory = CHAINS()[chain_id]["factory"]
    vault_salt = Web3.solidity_keccak(
        ["address", "uint256", "address"],
        [nft, token_id, user.id]
    ).hex()

    await db.execute(
        insert(FractionalListing).values(
            nft_contract=nft,
            token_id=token_id,
            shares=shares,
            creator_id=user.id,
            chain_id=chain_id,
            vault_salt=vault_salt,             # for debugging
        ).on_conflict_do_nothing()
    )
    await db.commit()

    return {"status": "draft-recorded"}


# ─────────────────────────────────────────────────────────────────────────────
# POST /fractional/listen  – dev helper to back-fill events
# ─────────────────────────────────────────────────────────────────────────────
from web3 import Web3
from importlib import resources

FACTORY_ABI = json.loads(
    resources.files("app.abi").joinpath("VaultFactory.json").read_text()
)

@router.post("/listen", tags=["dev"])
async def backfill_events(
    chain_id: int = 11155111,
    db: AsyncSession = Depends(get_db),
):
    """
    Development-only endpoint.  
    Poll latest VaultCreated events and upsert rows.
    """
    if chain_id not in CHAINS():
        raise HTTPException(400, "unsupported")

    w3 = Web3(Web3.HTTPProvider(CHAINS()[chain_id]["rpc"]))
    factory = w3.eth.contract(
        address=CHAINS()[chain_id]["factory"],
        abi=FACTORY_ABI
    )
    logs = factory.events.VaultCreated().get_logs(fromBlock="latest")
    imported = 0
    for ev in logs:
        args = ev["args"]
        await db.execute(
            insert(FractionalListing).values(
                vault      = args.vault,
                nft_contract = args.nft,
                token_id   = args.tokenId,
                shares     = args.shares,
                creator_id = args.creator,
                chain_id   = chain_id,
            ).on_conflict_do_nothing()
        )
        imported += 1
    await db.commit()
    return {"imported": imported}
