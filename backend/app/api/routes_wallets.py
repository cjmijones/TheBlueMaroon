import os

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.wallet import WalletCreate, WalletRead
from app.crud import wallet as crud
from app.auth.deps import get_db, get_current_user
from siwe import SiweMessage, VerificationError, ExpiredMessage, DomainMismatch, \
                 NonceMismatch, InvalidSignature

router = APIRouter(prefix="/wallets", tags=["wallets"])

ALLOWED_CHAINS = os.getenv("ALLOWED_CHAINS")
SIWE_TTL = timedelta(minutes=5)

def verify_siwe(
    payload: WalletCreate,
    expected_domain: str,
    expected_nonce: str,             # retrieve from DB / redis
) -> SiweMessage:
    """
    Production-grade SIWE verification.

    Raises HTTPException(400) on any failure.
    Returns the validated SiweMessage if successful.
    """
    try:
        msg = SiweMessage(payload.message)

        msg.verify(
            signature=payload.signature,
            domain   =expected_domain,
            nonce    =expected_nonce,
            chain_id =msg.chainId,   # library checks if provided
            time     =datetime.now(timezone.utc)  # enforces expirationTime & notBefore
        )

        if msg.chainId not in ALLOWED_CHAINS:
            raise ValueError(f"unsupported chain {msg.chainId}")

        if datetime.now(timezone.utc) - msg.issuedAt > SIWE_TTL:
            raise ValueError("message too old")

        if msg.address.lower() != payload.address.lower():
            raise ValueError("address mismatch")

        return msg

    except (VerificationError, ExpiredMessage, DomainMismatch,
            NonceMismatch, InvalidSignature, ValueError) as ex:
        raise HTTPException(400, f"SIWE verification failed: {ex}")

@router.get("/", response_model=list[WalletRead])
async def my_wallets(
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    return crud.list_wallets(db, user["sub"])        # Auth0 `sub` → user ID

@router.post("/", response_model=WalletRead, status_code=status.HTTP_201_CREATED)
async def link_wallet(
    payload: WalletCreate,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    verify_siwe(payload)
    try:
        w = crud.add_wallet(db, user["sub"], payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return w

@router.delete("/{address}", status_code=status.HTTP_204_NO_CONTENT)
async def unlink_wallet(
    address: str,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    try:
        crud.remove_wallet(db, user["sub"], address)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
