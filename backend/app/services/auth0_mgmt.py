"""
auth0_mgmt.py
-------------
Utility functions for promoting / demoting Auth0 roles
and immediately reflecting them in Neon via the /auth0/user-sync
endpoint.
"""

import httpx, time, logging, hmac, hashlib, json
from functools import lru_cache
from app.core.config import get_settings

settings = get_settings()
log = logging.getLogger("auth0_mgmt")

# --------------------------------------------------------------------
# 1.  Cached M2M token
# --------------------------------------------------------------------
_token_cache: tuple[float, str] | None = None    # (expires_at, token)

async def _get_m2m_token() -> str:
    global _token_cache
    now = time.time()
    if _token_cache and _token_cache[0] - now > 30:
        return _token_cache[1]

    payload = {
        "grant_type": "client_credentials",
        "client_id": settings.auth0_m2m_client_id,
        "client_secret": settings.auth0_m2m_client_secret,
        "audience": f"https://{settings.auth0_domain}/api/v2/",
    }
    async with httpx.AsyncClient(timeout=10) as cli:
        res = await cli.post(f"https://{settings.auth0_domain}/oauth/token",
                             json=payload)
        res.raise_for_status()
        j = res.json()
        _token_cache = (now + j["expires_in"], j["access_token"])
        log.info("🔑 fetched new Auth0 M2M token")
        return j["access_token"]

# --------------------------------------------------------------------
# 2.  Helper to map slug → role_id  (cached)
# --------------------------------------------------------------------
_role_cache: dict[str, str] | None = None

async def _slug_to_id(slug: str) -> str:
    global _role_cache
    if _role_cache and slug in _role_cache:
        return _role_cache[slug]

    token = await _get_m2m_token()
    async with httpx.AsyncClient(timeout=10) as cli:
        res = await cli.get(
            f"https://{settings.auth0_domain}/api/v2/roles",
            headers={"Authorization": f"Bearer {token}"},
        )
        res.raise_for_status()
        _role_cache = {r["name"]: r["id"] for r in res.json()}
        return _role_cache[slug]

# --------------------------------------------------------------------
# 3.  Public function: add or remove a role
# --------------------------------------------------------------------
async def add_role_to_user(user_id: str, role_slug: str):
    """
    Assigns an Auth0 role and pings /auth0/user-sync so Neon mirrors it.
    """
    role_id = await _slug_to_id(role_slug)
    token   = await _get_m2m_token()

    log.info("🔁 adding role %s to user %s", role_slug, user_id)
    async with httpx.AsyncClient(timeout=10) as cli:
        # 3-A Assign role in Auth0
        res = await cli.post(
            f"https://{settings.auth0_domain}/api/v2/users/{user_id}/roles",
            headers={"Authorization": f"Bearer {token}",
                     "Content-Type": "application/json"},
            json={"roles": [role_id]},
        )
        res.raise_for_status()

        # 3-B  Call /auth0/user-sync so Neon sees it immediately
        body = json.dumps({"user": {"user_id": user_id}, "roles": [role_slug]})
        sig  = hmac.new(settings.auth0_sync_hmac.encode(), body.encode(),
                        hashlib.sha256).hexdigest()

        await cli.post(
            f"{settings.public_base_url}/api/auth0/user-sync",
            headers={"X-Auth0-Signature": sig,
                     "Content-Type": "application/json"},
            content=body,
        )
