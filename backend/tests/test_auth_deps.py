import asyncio
from datetime import datetime, timedelta

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt

from app.auth import deps
from app.models.user import User


class FakeSession:
    def __init__(self):
        self.commits = 0
        self.inserted = None
        self.updated = None
        self.user = None

    async def execute(self, statement):
        visit_name = getattr(statement, "__visit_name__", "")
        if visit_name == "select":
            return FakeResult(self.user)
        if visit_name == "insert":
            self.inserted = dict(statement.compile().params)
            self.user = User(
                id=self.inserted["id"],
                email=self.inserted["email"],
                name=self.inserted["name"],
                picture=self.inserted["picture"],
                created_at=self.inserted["created_at"],
                last_login=self.inserted["last_login"],
            )
            return FakeResult(None)
        if visit_name == "update":
            self.updated = dict(statement.compile().params)
            return FakeResult(None)
        raise AssertionError(f"Unexpected statement: {statement}")

    def add(self, value):
        raise AssertionError("get_current_user should use explicit insert/update statements")

    async def commit(self):
        self.commits += 1


class FakeResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value

    def scalar_one(self):
        return self.value


@pytest.fixture(autouse=True)
def supabase_secret_settings(monkeypatch):
    monkeypatch.setattr(deps.settings, "supabase_jwt_secret", "unit-secret")
    monkeypatch.setattr(deps.settings, "supabase_jwt_audience", "authenticated")
    monkeypatch.setattr(deps.settings, "supabase_jwt_issuer", None)
    monkeypatch.setattr(deps.settings, "supabase_url", None)


def make_token(claims: dict) -> str:
    base_claims = {
        "aud": "authenticated",
        "exp": datetime.utcnow() + timedelta(minutes=5),
        "iat": datetime.utcnow(),
    }
    base_claims.update(claims)
    return jwt.encode(base_claims, "unit-secret", algorithm="HS256")


def test_get_current_user_upserts_local_user_from_supabase_claims():
    token = make_token(
        {
            "sub": "user-123",
            "email": "artist@example.com",
            "user_metadata": {
                "name": "Blue Artist",
                "picture": "https://example.com/avatar.png",
            },
        }
    )
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    db = FakeSession()

    user = asyncio.run(deps.get_current_user(creds=creds, db=db))

    assert user.id == "user-123"
    assert user.email == "artist@example.com"
    assert user.name == "Blue Artist"
    assert user.picture == "https://example.com/avatar.png"
    assert db.commits == 1
    assert db.inserted["id"] == "user-123"


def test_get_current_user_rejects_missing_subject_claim():
    token = make_token({"email": "artist@example.com"})
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(deps.get_current_user(creds=creds, db=FakeSession()))

    assert exc.value.status_code == 401


def test_get_current_user_rejects_wrong_issuer_when_secret_fallback_is_configured(monkeypatch):
    monkeypatch.setattr(
        deps.settings,
        "supabase_jwt_issuer",
        "https://project.supabase.co/auth/v1",
    )
    token = make_token(
        {
            "sub": "user-123",
            "email": "artist@example.com",
            "iss": "https://other-project.supabase.co/auth/v1",
        }
    )
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(deps.get_current_user(creds=creds, db=FakeSession()))

    assert exc.value.status_code == 401
