from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel
from app.models.user import User
from app.auth.deps import get_current_user
from app.db.session import get_db

router = APIRouter()

class UsernameUpdateRequest(BaseModel):
    username: str

@router.post("/me/update-username")
async def update_username(
    body: UsernameUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check if username is taken by another user
    result = await db.execute(select(User).where(User.name == body.username))
    existing = result.scalar_one_or_none()

    if existing and existing.id != current_user.id:
        raise HTTPException(status_code=400, detail="Username already taken")

    await db.execute(
        update(User)
        .where(User.id == current_user.id)
        .values(name=body.username)
    )
    await db.commit()
    return {"status": "ok", "username": body.username}
