# app/auth/deps.py
import os
import time
from urllib.parse import urljoin

import httpx
from jose import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis.asyncio import Redis
from sqlalchemy import insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.db.session import get_db
from app.models.user import User
from app.core.config import get_settings

settings = get_settings()
bearer_scheme = HTTPBearer()


def _supabase_jwks_url() -> str:
    if settings.supabase_jwks_url:
        return settings.supabase_jwks_url
    if not settings.supabase_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase auth is not configured",
        )
    return urljoin(settings.supabase_url.rstrip("/") + "/", "auth/v1/.well-known/jwks.json")


def _supabase_issuer() -> str | None:
    if settings.supabase_jwt_issuer:
        return settings.supabase_jwt_issuer
    if settings.supabase_url:
        return urljoin(settings.supabase_url.rstrip("/") + "/", "auth/v1")
    return None


def _jwks():
    """Fetch and cache Supabase public JWT keys for 5 minutes."""
    ttl_key = "_fetched_at"
    if ttl_key in _jwks.__dict__ and time.time() - _jwks.__dict__[ttl_key] < 300:
        return _jwks.__dict__["jwks"]

    resp = httpx.get(_supabase_jwks_url(), timeout=10)
    resp.raise_for_status()
    _jwks.__dict__.update(jwks=resp.json(), _fetched_at=time.time())
    return _jwks.__dict__["jwks"]


def _decode_token(token: str):
    """Decode a Supabase Auth access token."""
    if settings.supabase_jwt_secret:
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience=settings.supabase_jwt_audience,
        )

    unverified = jwt.get_unverified_header(token)
    kid = unverified.get("kid")
    keys = _jwks().get("keys", [])
    key = next((candidate for candidate in keys if candidate.get("kid") == kid), None)
    if not key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to find matching Supabase signing key",
        )

    decode_kwargs = {
        "algorithms": settings.algorithms,
        "audience": settings.supabase_jwt_audience,
    }
    issuer = _supabase_issuer()
    if issuer:
        decode_kwargs["issuer"] = issuer

    return jwt.decode(token, key, **decode_kwargs)


async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = _decode_token(creds.credentials)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc

    sub = payload["sub"]
    email = payload.get("email")
    user_metadata = payload.get("user_metadata") or {}
    name = (
        user_metadata.get("name")
        or user_metadata.get("full_name")
        or payload.get("name")
        or email
    )
    picture = (
        user_metadata.get("picture")
        or user_metadata.get("avatar_url")
        or payload.get("picture")
    )
    now = datetime.utcnow()

    result = await db.execute(select(User).where(User.id == sub))
    user = result.scalar_one_or_none()

    if user:
        updates = {}
        if email and user.email != email:
            updates["email"] = email
        if name and user.name != name:
            updates["name"] = name
        if picture and user.picture != picture:
            updates["picture"] = picture
        if not user.last_login or (now - user.last_login).seconds > 300:
            updates["last_login"] = now

        if updates:
            await db.execute(update(User).where(User.id == sub).values(**updates))
            await db.commit()
        return user

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
    Legacy Auth0 helper. Supabase refresh is handled client-side by supabase-js.
    """
    if not settings.auth0_domain or not settings.auth0_client_id or not settings.auth0_client_secret:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Auth0 refresh tokens are no longer configured",
        )

    token_url = f"https://{settings.auth0_domain}/oauth/token"
    data = {
        "grant_type": "refresh_token",
        "client_id": settings.auth0_client_id,
        "client_secret": settings.auth0_client_secret,
        "refresh_token": refresh_token,
    }

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
