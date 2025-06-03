# app/services/didit.py
import httpx, time, asyncio, logging
from typing import Tuple
from app.core.config import get_settings  # ✅ NEW: use app settings

# ✅ Load app settings
settings = get_settings()
logger = logging.getLogger("didit")

_token_cache: Tuple[float, str] | None = None      # (expires_at, token)


async def _get_access_token() -> str:
    """
    Client-credential flow. Caches token until 30 s before expiry.
    """
    global _token_cache
    now = time.time()
    if _token_cache and _token_cache[0] - now > 30:     # still valid
        return _token_cache[1]

    async with httpx.AsyncClient(timeout=10) as cli:
        resp = await cli.post(
            f"{settings.didit_token_base_url}/auth/v2/token",
            data={
                "grant_type": "client_credentials",
                "client_id": settings.didit_client_id,
                "client_secret": settings.didit_client_secret,
            },
        )
        resp.raise_for_status()
        j = resp.json()
        logger.info("🔐 Fetched new Didit token")
        _token_cache = (now + j["expires_in"], j["access_token"])
        return j["access_token"]


async def create_verification_session(user_id: str, email: str) -> dict:
    """
    Returns JSON containing `session_id` and `url` (hosted flow).
    """
    token = await _get_access_token()
    payload = {
        "callback_url": f"{settings.public_base_url}/api/kyc/webhook",
        "metadata": {"user_id": user_id, "email": email},
    }
    async with httpx.AsyncClient(timeout=10) as cli:
        resp = await cli.post(
            f"{settings.didit_verify_base_url}/v1/session/",
            headers={"Authorization": f"Bearer {token}"},
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()


async def get_decision(session_id: str) -> dict:
    """
    Optional helper to poll final decision (if webhook missed).
    """
    token = await _get_access_token()
    async with httpx.AsyncClient(timeout=10) as cli:
        resp = await cli.get(
            f"{settings.didit_verify_base_url}/v1/session/{session_id}/decision/",
            headers={"Authorization": f"Bearer {token}"},
        )
        resp.raise_for_status()
        return resp.json()
