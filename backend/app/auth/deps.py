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
import os

AUTH0_DOMAIN     = os.getenv("AUTH0_DOMAIN")
AUTH0_AUDIENCE   = os.getenv("AUTH0_AUDIENCE")
AUTH0_ALGORITHMS = os.getenv("AUTH0_ALGORITHMS", "RS256").split(",")

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
    email    = payload.get("email")
    name     = payload.get("name")
    picture  = payload.get("picture")
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
