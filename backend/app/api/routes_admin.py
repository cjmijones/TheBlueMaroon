from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.admin import get_admin_user
from app.auth.authorization import build_current_user_summary
from app.db.session import get_db
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["Admin"])


def _iso(value: Any) -> str | None:
    if isinstance(value, datetime):
        return value.isoformat()
    if value is None:
        return None
    return str(value)


def _wallet_payload(wallet: Any) -> dict[str, Any]:
    return {
        "address": getattr(wallet, "address", None),
        "chain_id": getattr(wallet, "chain_id", None),
        "ens_name": getattr(wallet, "ens_name", None),
        "is_primary": bool(getattr(wallet, "is_primary", False)),
        "linked_at": _iso(getattr(wallet, "linked_at", None)),
    }


def _verification_payload(user: Any, summary: dict[str, Any]) -> dict[str, Any]:
    verification = getattr(user, "verification", None)
    return {
        **summary["verification"],
        "aml_status": getattr(verification, "aml_status", None),
        "aml_score": getattr(verification, "aml_score", None),
        "aml_checked_at": _iso(getattr(verification, "aml_checked_at", None)),
        "didit_session_id": getattr(verification, "didit_session_id", None),
    }


def admin_user_payload(user: Any) -> dict[str, Any]:
    summary = build_current_user_summary(user)
    wallets = list(getattr(user, "wallets", None) or [])
    return {
        **summary,
        "verification": _verification_payload(user, summary),
        "wallets": {
            **summary["wallets"],
            "items": [_wallet_payload(wallet) for wallet in wallets],
        },
    }


def _with_admin_user_loads(statement):
    return statement.options(
        selectinload(User.roles),
        selectinload(User.wallets),
        selectinload(User.verification),
    )


@router.get("/me", response_model=dict)
async def get_admin_me(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        _with_admin_user_loads(select(User).where(User.id == admin.id))
    )
    full_admin = result.scalar_one()
    return {"admin": admin_user_payload(full_admin)}


@router.get("/users", response_model=dict)
async def list_admin_users(
    q: str | None = Query(default=None, min_length=1, max_length=120),
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    del admin

    statement = _with_admin_user_loads(
        select(User).order_by(User.created_at.desc()).limit(limit).offset(offset)
    )
    if q:
        pattern = f"%{q.lower()}%"
        statement = statement.where(
            or_(
                func.lower(User.id).like(pattern),
                func.lower(User.email).like(pattern),
                func.lower(User.name).like(pattern),
            )
        )

    result = await db.execute(statement)
    users = result.scalars().all()
    return {
        "users": [admin_user_payload(user) for user in users],
        "limit": limit,
        "offset": offset,
    }
