from fastapi import APIRouter, Body
from app.auth.deps import exchange_refresh_token

router = APIRouter(prefix="/token", tags=["auth"])

@router.post("/refresh")
async def refresh_access_token(payload: dict = Body(...)):
    """
    Let the client manually exchange a refresh token for a new access token.
    """
    refresh_token = payload.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="Missing refresh_token")

    new_tokens = await exchange_refresh_token(refresh_token)
    return new_tokens
