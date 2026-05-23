from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user, get_db
from app.models import Transaction, User, Wallet

router = APIRouter(prefix="/transactions", tags=["transactions"])


class TransactionRecordIn(BaseModel):
    hash: str = Field(..., pattern=r"^0x[a-fA-F0-9]{64}$")
    wallet_address: str | None = Field(None, pattern=r"^0x[a-fA-F0-9]{40}$")
    chain_id: int
    method: str = Field(..., min_length=1, max_length=80)
    status: Literal["submitted", "pending", "mined", "failed"] = "submitted"
    payload_json: dict[str, Any] = Field(default_factory=dict)


def _transaction_payload(tx: Transaction) -> dict[str, Any]:
    return {
        "hash": tx.hash,
        "user_id": tx.user_id,
        "wallet_address": tx.wallet_address,
        "chain_id": tx.chain_id,
        "method": tx.method,
        "payload_json": tx.payload_json or {},
        "status": tx.status,
        "created_at": tx.created_at.isoformat() if tx.created_at else None,
        "updated_at": tx.updated_at.isoformat() if tx.updated_at else None,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def record_transaction(
    payload: TransactionRecordIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tx_hash = payload.hash.lower()
    wallet_address = payload.wallet_address.lower() if payload.wallet_address else None
    linked_wallet_address: str | None = None

    if wallet_address:
        result = await db.execute(
            select(Wallet.address).where(
                Wallet.address == wallet_address,
                Wallet.user_id == user.id,
            )
        )
        linked_wallet_address = result.scalar_one_or_none()

    existing = await db.get(Transaction, tx_hash)
    tx_payload = {
        **payload.payload_json,
        "submitted_wallet_address": wallet_address,
    }

    if existing:
        if existing.user_id and existing.user_id != user.id:
            raise HTTPException(status.HTTP_409_CONFLICT, "Transaction is already recorded by another user")
        existing.user_id = user.id
        existing.wallet_address = linked_wallet_address
        existing.chain_id = payload.chain_id
        existing.method = payload.method
        existing.status = payload.status
        existing.payload_json = tx_payload
        tx = existing
    else:
        tx = Transaction(
            hash=tx_hash,
            user_id=user.id,
            wallet_address=linked_wallet_address,
            chain_id=payload.chain_id,
            method=payload.method,
            status=payload.status,
            payload_json=tx_payload,
        )
        db.add(tx)

    await db.commit()
    await db.refresh(tx)
    return _transaction_payload(tx)


@router.get("/")
async def list_transactions(
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == user.id)
        .order_by(Transaction.created_at.desc())
        .limit(limit)
    )
    return [_transaction_payload(tx) for tx in result.scalars().all()]
