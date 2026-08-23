import asyncio

import pytest
from fastapi import HTTPException

from app.api import routes_fractional
from app.schemas.fractional import FractionalCreate, FractionalFinalize


class FakeRow:
    def __init__(self, **values):
        self.__dict__.update(values)


class FakeResult:
    def __init__(self, first=None):
        self._first = first

    def first(self):
        return self._first


class FakeDb:
    def __init__(self, results=None):
        self.results = list(results or [])
        self.statements = []
        self.params = []
        self.commits = 0

    async def execute(self, stmt, params=None):
        self.statements.append(str(stmt))
        self.params.append(params or {})
        if self.results:
            return self.results.pop(0)
        return FakeResult()

    async def commit(self):
        self.commits += 1


class FakeUser:
    id = "user-123"


def allow_creator_kyc(monkeypatch):
    async def fake_require_creator_kyc_ready(db, user_id):
        return object()

    monkeypatch.setattr(
        routes_fractional,
        "require_creator_kyc_ready",
        fake_require_creator_kyc_ready,
        raising=False,
    )


def make_payload(predicted_vault="0x3333333333333333333333333333333333333333"):
    return FractionalCreate(
        nft_contract="0x1111111111111111111111111111111111111111",
        token_id=7,
        shares=100,
        chain_id=11155111,
        round_price=1.25,
        creator_wallet_address="0x2222222222222222222222222222222222222222",
        predicted_vault=predicted_vault,
    )


def test_create_fractional_listing_stores_predicted_vault(monkeypatch):
    async def fake_require_wallet(db, user_id, address):
        return object()

    guard_calls = []

    async def fake_require_creator_action_ready(db, user_id, address):
        guard_calls.append((user_id, address))
        return object()

    monkeypatch.setattr(routes_fractional, "require_linked_wallet", fake_require_wallet)
    monkeypatch.setattr(
        routes_fractional,
        "require_creator_action_ready",
        fake_require_creator_action_ready,
        raising=False,
    )
    db = FakeDb(results=[FakeResult(first=None)])

    result = asyncio.run(routes_fractional.create_fractional_listing(make_payload(), db=db, user=FakeUser()))

    assert result == {"status": "draft_created", "predicted_vault": "0x3333333333333333333333333333333333333333"}
    assert guard_calls == [("user-123", "0x2222222222222222222222222222222222222222")]
    assert db.commits == 1
    assert db.params[-1]["predicted_vault"] == "0x3333333333333333333333333333333333333333"


def test_create_fractional_listing_rejects_duplicate_draft(monkeypatch):
    async def fake_require_wallet(db, user_id, address):
        return object()

    async def fake_require_creator_action_ready(db, user_id, address):
        return object()

    monkeypatch.setattr(routes_fractional, "require_linked_wallet", fake_require_wallet)
    monkeypatch.setattr(
        routes_fractional,
        "require_creator_action_ready",
        fake_require_creator_action_ready,
        raising=False,
    )
    db = FakeDb(results=[FakeResult(first=FakeRow(id=9, status="draft"))])

    with pytest.raises(HTTPException) as exc:
        asyncio.run(routes_fractional.create_fractional_listing(make_payload(), db=db, user=FakeUser()))

    assert exc.value.status_code == 409


def test_create_fractional_listing_rejects_missing_kyc(monkeypatch):
    async def fake_require_wallet(db, user_id, address):
        return object()

    async def fake_require_creator_action_ready(db, user_id, address):
        raise HTTPException(status_code=403, detail="KYC verification is required")

    monkeypatch.setattr(routes_fractional, "require_linked_wallet", fake_require_wallet)
    monkeypatch.setattr(
        routes_fractional,
        "require_creator_action_ready",
        fake_require_creator_action_ready,
        raising=False,
    )
    db = FakeDb(results=[FakeResult(first=None)])

    with pytest.raises(HTTPException) as exc:
        asyncio.run(routes_fractional.create_fractional_listing(make_payload(), db=db, user=FakeUser()))

    assert exc.value.status_code == 403
    assert "kyc" in str(exc.value.detail).lower()


def test_finalize_fractional_listing_updates_exact_matching_draft(monkeypatch):
    allow_creator_kyc(monkeypatch)
    db = FakeDb(
        results=[
            FakeResult(first=None),
            FakeResult(first=FakeRow(id=12, vault=None)),
        ]
    )

    result = asyncio.run(
        routes_fractional.finalize_fractional_listing(
            vault="0x3333333333333333333333333333333333333333",
            body=FractionalFinalize(tx_hash="0x" + "a" * 64),
            db=db,
            user=FakeUser(),
        )
    )

    assert result == {"status": "active", "vault": "0x3333333333333333333333333333333333333333"}
    assert db.commits == 1
    assert db.params[-1]["id"] == 12
    assert db.params[-1]["vault"] == "0x3333333333333333333333333333333333333333"


def test_finalize_fractional_listing_rejects_already_active_vault(monkeypatch):
    # KYC is already known for this user; this test isolates duplicate active-vault behavior.
    allow_creator_kyc(monkeypatch)
    db = FakeDb(results=[FakeResult(first=FakeRow(id=12, status="active"))])

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            routes_fractional.finalize_fractional_listing(
                vault="0x3333333333333333333333333333333333333333",
                body=FractionalFinalize(tx_hash="0x" + "a" * 64),
                db=db,
                user=FakeUser(),
            )
        )

    assert exc.value.status_code == 409


def test_finalize_fractional_listing_rejects_missing_matching_draft(monkeypatch):
    allow_creator_kyc(monkeypatch)
    db = FakeDb(results=[FakeResult(first=None), FakeResult(first=None)])

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            routes_fractional.finalize_fractional_listing(
                vault="0x3333333333333333333333333333333333333333",
                body=FractionalFinalize(tx_hash="0x" + "a" * 64),
                db=db,
                user=FakeUser(),
            )
        )

    assert exc.value.status_code == 404


def test_finalize_fractional_listing_rejects_missing_kyc(monkeypatch):
    async def fake_require_creator_kyc_ready(db, user_id):
        raise HTTPException(status_code=403, detail="KYC verification is required")

    monkeypatch.setattr(
        routes_fractional,
        "require_creator_kyc_ready",
        fake_require_creator_kyc_ready,
        raising=False,
    )
    db = FakeDb(
        results=[
            FakeResult(first=None),
            FakeResult(first=FakeRow(id=12, vault=None)),
        ]
    )

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            routes_fractional.finalize_fractional_listing(
                vault="0x3333333333333333333333333333333333333333",
                body=FractionalFinalize(tx_hash="0x" + "a" * 64),
                db=db,
                user=FakeUser(),
            )
        )

    assert exc.value.status_code == 403
    assert "kyc" in str(exc.value.detail).lower()
