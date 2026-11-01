from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.authorization import build_current_user_summary
from app.auth.deps import get_current_user
from app.db.session import get_db
from app.models.user import User

router = APIRouter()

@router.get("/me", response_model=dict, tags=["Auth"])
async def get_user_info(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.roles),
            selectinload(User.wallets),
            selectinload(User.verification),
        )
        .where(User.id == user.id)
    )
    full_user = result.scalar_one()
    return build_current_user_summary(full_user)
