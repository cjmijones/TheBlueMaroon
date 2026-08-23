from typing import Any

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.deps import get_current_user
from app.db.session import get_db
from app.models.user import User

ADMIN_ROLE = "admin"


def has_admin_role(user: Any) -> bool:
    return any(
        getattr(role, "slug", None) == ADMIN_ROLE
        for role in getattr(user, "roles", []) or []
    )


async def require_admin_user(db: AsyncSession, current_user: User) -> User:
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles))
        .where(User.id == current_user.id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user is not registered locally",
        )
    if not has_admin_role(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role is required",
        )
    return user


async def get_admin_user(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    return await require_admin_user(db, current_user)
