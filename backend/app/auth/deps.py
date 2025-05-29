# app/auth/deps.py
import json, time, asyncio, httpx
from functools import lru_cache
from urllib.parse import urljoin
from jose import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update
from datetime import datetime

from app.db.session import get_db
from app.models.user import User
from app.core.config import get_settings

import os
from redis.asyncio import Redis

settings = get_settings()

AUTH0_DOMAIN = settings.auth0_domain
AUTH0_AUDIENCE = settings.auth0_audience
AUTH0_ALGORITHMS = settings.algorithms

bearer_scheme = HTTPBearer()

JWKS_URL = urljoin(f"https://{AUTH0_DOMAIN}", "/.well-known/jwks.json")


@lru_cache(maxsize=1)
def _jwks():
    """Fetch & cache Auth0's public keys (5-min TTL)."""
    ttl_key = "_fetched_at"
    if ttl_key in _jwks.__dict__ and time.time() - _jwks.__dict__[ttl_key] < 300:
        return _jwks.__dict__["jwks"]
    resp = httpx.get(JWKS_URL, timeout=10)
    resp.raise_for_status()
    _jwks.__dict__.update(jwks=resp.json(), _fetched_at=time.time())
    return _jwks.__dict__["jwks"]


def _decode_token(token: str):
    unverified = jwt.get_unverified_header(token)
    kid = unverified["kid"]
    key = next(k for k in _jwks()["keys"] if k["kid"] == kid)
    return jwt.decode(
        token,
        key,
        algorithms=AUTH0_ALGORITHMS,
        audience=AUTH0_AUDIENCE,
        issuer=f"https://{AUTH0_DOMAIN}/",
    )


async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = _decode_token(creds.credentials)
        print("🔐 JWT payload:", json.dumps(payload, indent=2))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid or expired token") from exc

    sub      = payload["sub"]                     # Auth0 user id
    email    = payload.get("https://api.thebluemaroon.local/email")
    name     = payload.get("https://api.thebluemaroon.local/name")
    picture  = payload.get("https://api.thebluemaroon.local/picture")
    created_at  = payload.get("https://api.thebluemaroon.local/created_at")
    now      = datetime.utcnow()

    # ➊ try to fetch
    result = await db.execute(select(User).where(User.id == sub))
    user = result.scalar_one_or_none()

    if user:
        # ➋ update last_login **in‑place** if >5 min old
        if not user.last_login or (now - user.last_login).seconds > 300:
            await db.execute(
                update(User)
                .where(User.id == sub)
                .values(last_login=now)
            )
            await db.commit()
        return user

    # ➌ new user → insert
    await db.execute(
        insert(User).values(
            id=sub,
            email=email,
            name=name,
            picture=picture,    
            created_at=now,
            last_login=now,
        )
    )
    await db.commit()
    return (await db.execute(select(User).where(User.id == sub))).scalar_one()


async def exchange_refresh_token(refresh_token: str) -> dict:
    """
    Exchange a refresh token for a new access token via Auth0.
    """

    token_url = f"https://{settings.auth0_domain}/oauth/token"
    data = {
        "grant_type": "refresh_token",
        "client_id": settings.auth0_client_id,
        "client_secret": settings.auth0_client_secret,
        "refresh_token": refresh_token,
    }

    print("🔧 token‑url →", settings.auth0_token_url)
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(token_url, data=data)

    try:
        response.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        ) from e

    return response.json()


def get_redis() -> Redis:
    return Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))