# app/api/routes_assets.py
import logging
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.addresses import CHAINS
from app.auth.deps       import get_current_user
from app.services.alchemy import fetch_assets

router = APIRouter(prefix="/assets", tags=["assets"])

# -------------------------------------------------------------------
# logger setup (inherits root handlers; only sets a namespace)
# -------------------------------------------------------------------
log = logging.getLogger("api.assets")
# Level is inherited from root, so set UVICORN_CMD --log-level debug
# or export LOG_LEVEL=DEBUG in prod if you want these lines.
# -------------------------------------------------------------------

@router.get("/{address}")
async def list_assets(
    address: str,
    chain_id: int = Query(11155111, description="EVM chain ID"),
    cursor: str | None = Query(None, description="Alchemy page key"),
    limit: int = Query(10, le=50),
    user = Depends(get_current_user),
):
    log.debug("▶ list_assets addr=%s chain=%s cursor=%s limit=%s user=%s",
              address, chain_id, cursor, limit, user.id)

    cfg = CHAINS().get(chain_id)
    if not cfg or not cfg["alchemy"]:
        log.warning("Unsupported chain %s requested by user %s", chain_id, user.id)
        raise HTTPException(400, "unsupported chain")

    log.debug("Using Alchemy RPC %s…", cfg['alchemy'][:40])   # truncate for readability

    data = await fetch_assets(cfg["alchemy"], address, cursor, limit)

    log.debug("Received %s items (next=%s) for addr=%s chain=%s",
              len(data['items']), data.get('next'), address, chain_id)

    return data       #  { items: [...], next: pageKey|None }
