from datetime import datetime
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Wallet, AuditEvent
from app.schemas.wallet import WalletCreate


# ---------- helpers ----------

async def _add_audit(
    db: AsyncSession,
    user_id: str,
    action: str,
    meta: dict,
) -> None:
    db.add(
        AuditEvent(
            user_id=user_id,
            action=action,
            audit_event_metadata=meta,
        )
    )


# ---------- public crud ----------

async def add_wallet(
    db: AsyncSession,
    user_id: str,
    payload: WalletCreate,
) -> Wallet:
    address = payload.address.lower()

    # Check if the wallet already exists
    existing_wallet: Wallet | None = await db.get(Wallet, address)
    if existing_wallet and existing_wallet.user_id != user_id:
        raise ValueError("wallet already linked to another user")
    if existing_wallet:
        return existing_wallet

    # Determine if this is the user's first wallet
    result = await db.execute(
        select(Wallet).where(Wallet.user_id == user_id).limit(1)
    )
    is_primary = result.first() is None

    wallet = Wallet(
        address=address,
        user_id=user_id,
        is_primary=is_primary,
        chain_id=payload.chain_id,
        ens_name=payload.ens_name,
        linked_at=datetime.utcnow(),
    )
    db.add(wallet)

    await _add_audit(
        db,
        user_id,
        "wallet.linked",
        {
            "address": address,
            "chain_id": payload.chain_id,
            "ens_name": payload.ens_name,
            "is_primary": is_primary,
        },
    )

    await db.commit()
    await db.refresh(wallet)
    return wallet


async def list_wallets(db: AsyncSession, user_id: str) -> Sequence[Wallet]:
    result = await db.execute(select(Wallet).where(Wallet.user_id == user_id))
    return result.scalars().all()


async def remove_wallet(db: AsyncSession, user_id: str, address: str) -> None:
    address = address.lower()
    wallet: Wallet | None = await db.get(Wallet, address)
    if not wallet or wallet.user_id != user_id:
        raise ValueError("wallet not linked or unauthorized")

    await db.delete(wallet)
    await _add_audit(
        db,
        user_id,
        "wallet.unlinked",
        {"address": address, "chain_id": wallet.chain_id},
    )
    await db.commit()
