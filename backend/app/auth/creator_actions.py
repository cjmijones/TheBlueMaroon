from typing import Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import User, Wallet


def has_role(user: Any, slug: str) -> bool:
    return any(getattr(role, "slug", None) == slug for role in getattr(user, "roles", []) or [])


def kyc_is_clear(user: Any) -> bool:
    verification = getattr(user, "verification", None)
    return bool(
        verification
        and getattr(verification, "aml_status", None) == "clear"
        and getattr(verification, "id_verified_at", None)
    )


async def require_creator_kyc_ready(db: AsyncSession, user_id: str) -> User:
    user_result = await db.execute(
        select(User)
        .options(selectinload(User.roles), selectinload(User.verification))
        .where(User.id == user_id)
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Authenticated user was not found")
    if not has_role(user, "creator"):
        raise HTTPException(status_code=403, detail="Creator role is required")
    if not kyc_is_clear(user):
        raise HTTPException(status_code=403, detail="KYC verification is required")
    return user


async def require_creator_action_ready(
    db: AsyncSession,
    user_id: str,
    wallet_address: str | None,
) -> Wallet:
    if not wallet_address:
        raise HTTPException(status_code=403, detail="Linked wallet is required")

    wallet_result = await db.execute(
        select(Wallet).where(
            Wallet.user_id == user_id,
            Wallet.address == wallet_address.lower(),
        )
    )
    wallet = wallet_result.scalar_one_or_none()
    if not wallet:
        raise HTTPException(status_code=403, detail="Wallet is not linked to this account")

    await require_creator_kyc_ready(db, user_id)
    return wallet
