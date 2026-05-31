from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.role import Role
from app.models.userRole import UserRole


async def assign_role_slug(db: AsyncSession, user_id: str, slug: str) -> Role:
    result = await db.execute(select(Role).where(Role.slug == slug))
    role = result.scalar_one_or_none()
    if role is None:
        role = Role(slug=slug)
        db.add(role)
        await db.flush()

    user_role = await db.get(
        UserRole,
        {"user_id": user_id, "role_id": role.id},
    )
    if user_role is None:
        db.add(UserRole(user_id=user_id, role_id=role.id))

    return role


async def revoke_role_slug(db: AsyncSession, user_id: str, slug: str) -> None:
    result = await db.execute(select(Role).where(Role.slug == slug))
    role = result.scalar_one_or_none()
    if role is None:
        return

    await db.execute(
        delete(UserRole).where(
            UserRole.user_id == user_id,
            UserRole.role_id == role.id,
        )
    )
