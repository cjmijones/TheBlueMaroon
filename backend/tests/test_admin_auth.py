import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.auth.admin import require_admin_user


class FakeResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class FakeDb:
    def __init__(self, user):
        self.user = user

    async def execute(self, statement):
        return FakeResult(self.user)


def user_with_roles(*slugs):
    return SimpleNamespace(
        id="user-1",
        roles=[SimpleNamespace(slug=slug) for slug in slugs],
    )


def test_admin_gate_allows_local_admin_role():
    current_user = SimpleNamespace(id="user-1")

    admin_user = asyncio.run(
        require_admin_user(
            FakeDb(user_with_roles("member", "admin")),
            current_user,
        )
    )

    assert admin_user.id == "user-1"


def test_admin_gate_rejects_user_without_local_admin_role():
    current_user = SimpleNamespace(id="user-1")

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            require_admin_user(
                FakeDb(user_with_roles("member", "creator")),
                current_user,
            )
        )

    assert exc.value.status_code == 403
    assert "admin" in str(exc.value.detail).lower()


def test_admin_gate_rejects_missing_local_user():
    current_user = SimpleNamespace(id="user-1")

    with pytest.raises(HTTPException) as exc:
        asyncio.run(require_admin_user(FakeDb(None), current_user))

    assert exc.value.status_code == 401
