from fastapi import APIRouter, Depends, HTTPException, status
from app.auth.deps import exchange_refresh_token, _decode_token
from app.core.config import get_settings
import httpx

router = APIRouter(prefix="/test-tokens", tags=["dev-tools"])

settings = get_settings()


@router.post("/refresh-and-validate")
async def refresh_and_validate(refresh_token: str):
    """
    Dev-only endpoint:
    Exchanges a refresh token for a new access token and immediately validates it.
    """
    if settings.env_type != "dev":
        raise HTTPException(status_code=403, detail="Not available in production.")

    # Step 1: Exchange refresh_token → new access_token
    tokens = await exchange_refresh_token(refresh_token)
    access_token = tokens.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="No access_token returned.")

    # Step 2: Validate token locally using _decode_token
    try:
        payload = _decode_token(access_token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token decode failed: {e}")

    return {
        "status": "✅ success",
        "access_token_issued": access_token,
        "decoded_payload": payload,
        "expires_in": tokens.get("expires_in", "unknown"),
    }
