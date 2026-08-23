import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.auth import creator_actions


class FakeResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class FakeDb:
    def __init__(self, wallet=None, user=None, results=None):
        if results is not None:
            self.results = [FakeResult(value) for value in results]
        else:
            self.results = [FakeResult(wallet), FakeResult(user)]

    async def execute(self, statement):
        return self.results.pop(0)


def wallet(address="0xabc"):
    return SimpleNamespace(address=address, user_id="user-1")


def user(roles=("creator",), aml_status="clear", id_verified_at="2026-06-07"):
    return SimpleNamespace(
        id="user-1",
        roles=[SimpleNamespace(slug=slug) for slug in roles],
        verification=SimpleNamespace(
            aml_status=aml_status,
            id_verified_at=id_verified_at,
        ),
    )


def test_creator_action_guard_allows_creator_with_clear_kyc_and_linked_wallet():
    result = asyncio.run(
        creator_actions.require_creator_action_ready(
            FakeDb(wallet=wallet("0xabc"), user=user()),
            "user-1",
            "0xABC",
        )
    )

    assert result.address == "0xabc"


def test_creator_action_guard_rejects_missing_wallet():
    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            creator_actions.require_creator_action_ready(
                FakeDb(wallet=None, user=user()),
                "user-1",
                "0xABC",
            )
        )

    assert exc.value.status_code == 403
    assert "wallet" in str(exc.value.detail).lower()


def test_creator_action_guard_rejects_missing_creator_role():
    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            creator_actions.require_creator_action_ready(
                FakeDb(wallet=wallet(), user=user(roles=("member",))),
                "user-1",
                "0xABC",
            )
        )

    assert exc.value.status_code == 403
    assert "creator" in str(exc.value.detail).lower()


def test_creator_action_guard_rejects_missing_clear_kyc():
    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            creator_actions.require_creator_action_ready(
                FakeDb(wallet=wallet(), user=user(aml_status="pending", id_verified_at=None)),
                "user-1",
                "0xABC",
            )
        )

    assert exc.value.status_code == 403
    assert "kyc" in str(exc.value.detail).lower()


def test_creator_kyc_guard_allows_creator_with_clear_kyc_without_wallet_check():
    result = asyncio.run(
        creator_actions.require_creator_kyc_ready(
            FakeDb(results=[user()]),
            "user-1",
        )
    )

    assert result.id == "user-1"


def test_creator_kyc_guard_rejects_non_creator():
    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            creator_actions.require_creator_kyc_ready(
                FakeDb(results=[user(roles=("member",))]),
                "user-1",
            )
        )

    assert exc.value.status_code == 403
    assert "creator" in str(exc.value.detail).lower()
