# AFTER
from fastapi import APIRouter, Depends
from app.auth.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/me", response_model=dict, tags=["Auth"])
async def get_user_info(user: User = Depends(get_current_user)):
    return {
        "user_id": user.id,
        "email": user.email,
        "name": user.name,
        "created_at": user.created_at,
        "last_login": user.last_login,
    }
