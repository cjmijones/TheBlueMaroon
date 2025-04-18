from fastapi import APIRouter, Depends
from app.core.auth import verify_jwt

router = APIRouter()

@router.get("/me", tags=["Auth"])
def get_user_info(payload: dict = Depends(verify_jwt)):
    return {
        "user_id": payload.get("sub"),
        "email": payload.get("email"),
        "name": payload.get("name"),
    }
