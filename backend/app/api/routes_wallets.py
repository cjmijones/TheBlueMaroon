# routes_wallets.py
import os
import json
import re
from datetime import datetime, timezone, timedelta
from secrets import token_urlsafe
from urllib.parse import urlparse
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from redis.asyncio import Redis

from typing import Annotated 
from sqlalchemy.ext.asyncio import AsyncSession 

from app.models import User
from app.schemas.wallet import WalletCreate, WalletRead
from app.crud import wallet as crud
from app.services.chain import get_eth_balance, get_erc20_balance
from app.auth.deps import get_db, get_current_user, get_redis
from app.core.chains import CHAINS

from siwe import (
    SiweMessage,
    VerificationError,
    ExpiredMessage,
    DomainMismatch,
    NonceMismatch,
    InvalidSignature,
)

router = APIRouter(prefix="/wallets", tags=["wallets"])

# ──────────────────────────────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────────────────────────────

raw_chains = os.getenv("SIWE_ALLOWED_CHAINS", "[11155111, 1]")


def _parse_allowed_chains(raw: str) -> list[int]:
    cleaned = raw.split("#", 1)[0].strip()
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        # Be lenient with common env mistakes such as "{1, 137, 11155111}".
        parts = [
            part.strip()
            for part in cleaned.strip("{}[]()").split(",")
            if part.strip()
        ]
        parsed = [int(part) for part in parts]

    if not isinstance(parsed, list) or not all(isinstance(c, int) for c in parsed):
        raise ValueError("SIWE_ALLOWED_CHAINS must be a list of integer chain IDs")
    return parsed


try:
    ALLOWED_CHAINS = _parse_allowed_chains(raw_chains)
except (TypeError, ValueError) as e:
    raise ValueError(f"Invalid SIWE_ALLOWED_CHAINS: {raw_chains}") from e


SIWE_TTL = timedelta(minutes=5)

logger = logging.getLogger("siwe")          # use a dedicated namespace
logger.setLevel(logging.DEBUG) 

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _to_datetime(value) -> datetime:
    """
    python-siwe wraps date/time fields in ISO8601* classes that expose
    `._datetime`; convert them into plain `datetime` for arithmetic.
    """
    if isinstance(value, datetime):
        return value
    return getattr(value, "_datetime", value)  


def _redact_nonce(value) -> str:
    if value is None:
        return "missing"
    if isinstance(value, bytes):
        value = value.decode(errors="replace")
    value = str(value)
    if len(value) <= 8:
        return "present"
    return f"{value[:4]}...{value[-4:]}"


def _redact_address(address: str | None) -> str:
    if not address:
        return "<missing>"
    if len(address) <= 10:
        return "<redacted>"
    return f"{address[:6]}...{address[-4:]}"


# ──────────────────────────────────────────────────────────────────────────────
# Nonce
# ──────────────────────────────────────────────────────────────────────────────

NONCE_TTL = 300            # 5 minutes
NONCE_KEY = "siwe:{uid}:nonce"

async def _take_nonce(redis: Redis, user_id: str) -> str:
    """
    Atomically fetch **and delete** the nonce for this user (Redis GETDEL).
    Guarantees single-use even if two requests race.
    """
    key   = NONCE_KEY.format(uid=user_id)
    nonce = await redis.getdel(key)                # bytes | None
    logger.debug("siwe nonce take key=%s nonce=%s", key, _redact_nonce(nonce))
    if not nonce:
        raise HTTPException(400, "Nonce not found or expired")
    return nonce.decode()

# ──────────────────────────────────────────────────────────────────────────────
# Verification
# ──────────────────────────────────────────────────────────────────────────────

def verify_siwe(payload: WalletCreate, expected_domain: str, expected_nonce: str) -> SiweMessage:
    logger.debug(
        "verify_siwe start expected_nonce=%s payload_nonce=%s domain=%s message_present=%s signature_present=%s",
        _redact_nonce(expected_nonce),
        _redact_nonce(payload.nonce),
        expected_domain,
        bool(payload.message),
        bool(payload.signature),
    )
    try:
        msg = SiweMessage.from_message(payload.message)
        logger.debug(
            "siwe parsed nonce=%s domain=%s address=%s chain=%s",
            _redact_nonce(msg.nonce),
            msg.domain,
            _redact_address(msg.address),
            msg.chain_id,
        )
        msg.verify(
            signature=payload.signature,
            domain=expected_domain,
            nonce=expected_nonce,
            timestamp=datetime.now(timezone.utc),
        )

        if msg.chain_id not in ALLOWED_CHAINS:
            raise ValueError(f"unsupported chain {msg.chain_id}")


        issued_at = _to_datetime(msg.issued_at)
        if datetime.now(timezone.utc) - issued_at > SIWE_TTL:
            raise ValueError("message too old")
        

        if msg.address.lower() != payload.address.lower():
            raise ValueError("address mismatch")

        return msg

    except (VerificationError, ExpiredMessage, DomainMismatch, NonceMismatch, InvalidSignature, ValueError) as ex:
        raise HTTPException(400, f"SIWE verification failed: {ex}")


# ──────────────────────────────────────────────────────────────────────────────
# Initial Nonce Post Route
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/nonce")
async def issue_nonce(
    user : Annotated[User, Depends(get_current_user)],
    redis: Annotated[Redis, Depends(get_redis)],
):
    key   = NONCE_KEY.format(uid=user.id)
    nonce = token_urlsafe(16)
    was_set = await redis.set(key, nonce, ex=NONCE_TTL, nx=True)
    if not was_set:                       # reuse still-valid one
        nonce = (await redis.get(key)).decode()
    logger.debug("siwe nonce issue key=%s nonce=%s reused=%s", key, _redact_nonce(nonce), not was_set)
    return {"nonce": nonce}



# ──────────────────────────────────────────────────────────────────────────────
# Base Wallet Routes
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[WalletRead])
async def my_wallets(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    return await crud.list_wallets(db, user.id)


@router.post("/", response_model=WalletRead, status_code=status.HTTP_201_CREATED)
async def link_wallet(
    payload : WalletCreate,
    request : Request,
    user    : Annotated[User, Depends(get_current_user)],
    db      : Annotated[AsyncSession, Depends(get_db)],     # async!
    redis   : Annotated[Redis,        Depends(get_redis)],
):
    # 1️⃣ pull & erase nonce first
    expected_nonce = await _take_nonce(redis, user.id)

    # 2️⃣ derive expected domain
    raw_origin      = request.headers.get("origin") or str(request.base_url)
    expected_domain = urlparse(raw_origin).hostname or raw_origin

    # 3️⃣ verify
    verify_siwe(payload, expected_domain, expected_nonce)

    # 4️⃣ insert wallet
    wallet = await crud.add_wallet(db, user.id, payload)
    logger.debug("Wallet linked user=%s addr=%s", user.id, _redact_address(wallet.address))
    return wallet


# ──────────────────────────────────────────────────────────────────────────────
# Specified Wallet Address Routes
# ──────────────────────────────────────────────────────────────────────────────

ETH_ADDRESS = re.compile(r"^0x[a-fA-F0-9]{40}$")

@router.get("/{address}/balances")
async def wallet_balances(address: str,
                          chain_id: int = 11155111,   # default Sepolia in dev
                          user=Depends(get_current_user)):
    if chain_id not in CHAINS(): raise HTTPException(400, "unsupported chain")
    native = await get_eth_balance(address, chain_id)
    usdc   = await get_erc20_balance(address, "USDC", chain_id)
    return {"native_wei": native, "usdc": usdc, "chain_id": chain_id}


@router.delete("/{address}", status_code=status.HTTP_204_NO_CONTENT)
async def unlink_wallet(
    address: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    try:
        await crud.remove_wallet(db, user.id, address)
    except ValueError as e:
        raise HTTPException(404, str(e))
