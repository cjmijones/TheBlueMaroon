import asyncio
import string
from types import SimpleNamespace

from app.api import routes_wallets
from app.crud import wallet as wallet_crud
from app.schemas.wallet import WalletCreate


def test_generate_siwe_nonce_is_24_alphanumeric_chars():
    nonces = [routes_wallets._generate_siwe_nonce() for _ in range(20)]

    assert all(len(nonce) == 24 for nonce in nonces)
    assert all(set(nonce) <= set(string.ascii_letters + string.digits) for nonce in nonces)
    assert len(set(nonces)) > 1


def test_issue_nonce_uses_generate_siwe_nonce(monkeypatch):
    issued_nonces = []

    def fake_generate_siwe_nonce():
        nonce = f"NonceValue{len(issued_nonces):014d}"
        issued_nonces.append(nonce)
        return nonce

    class FakeRedis:
        def __init__(self):
            self.values = {}

        async def set(self, key, value, ex=None, nx=None):
            if nx and key in self.values:
                return False
            self.values[key] = value
            return True

        async def get(self, key):
            return self.values[key].encode()

    monkeypatch.setattr(routes_wallets, "_generate_siwe_nonce", fake_generate_siwe_nonce)

    db_user = type("User", (), {"id": "user-123"})()
    redis = FakeRedis()

    result = asyncio.run(routes_wallets.issue_nonce(user=db_user, redis=redis))

    assert result == {"nonce": "NonceValue00000000000000"}
    assert issued_nonces == ["NonceValue00000000000000"]
    assert redis.values == {routes_wallets.NONCE_KEY.format(uid="user-123"): "NonceValue00000000000000"}


def test_unlink_wallet_awaits_async_crud_call(monkeypatch):
    calls = []

    async def fake_remove_wallet(db, user_id, address):
        calls.append((db, user_id, address))

    monkeypatch.setattr(routes_wallets.crud, "remove_wallet", fake_remove_wallet)

    db = object()
    user = type("User", (), {"id": "user-123"})()

    asyncio.run(routes_wallets.unlink_wallet("0xABC", db=db, user=user))

    assert calls == [(db, "user-123", "0xABC")]


def test_take_nonce_returns_and_deletes_nonce():
    class FakeRedis:
        async def getdel(self, key):
            self.key = key
            return b"NonceValue123"

    redis = FakeRedis()

    result = asyncio.run(routes_wallets._take_nonce(redis, "user-123"))

    assert result == "NonceValue123"
    assert redis.key == routes_wallets.NONCE_KEY.format(uid="user-123")


def test_take_nonce_rejects_missing_nonce():
    class FakeRedis:
        async def getdel(self, key):
            return None

    try:
        asyncio.run(routes_wallets._take_nonce(FakeRedis(), "user-123"))
    except Exception as exc:
        assert getattr(exc, "status_code", None) == 400
        assert "nonce" in str(getattr(exc, "detail", "")).lower()
    else:
        raise AssertionError("_take_nonce should reject missing nonce")


def test_parse_allowed_chains_accepts_json_and_loose_comma_formats():
    assert routes_wallets._parse_allowed_chains("[11155111, 1]") == [11155111, 1]
    assert routes_wallets._parse_allowed_chains("{11155111, 1}") == [11155111, 1]


class FakeWalletCrudResult:
    def __init__(self, first_value=None):
        self.first_value = first_value

    def first(self):
        return self.first_value


class FakeWalletCrudDb:
    def __init__(self, existing_wallet=None, first_wallet=None):
        self.existing_wallet = existing_wallet
        self.first_wallet = first_wallet
        self.added = []
        self.commits = 0
        self.refreshed = []

    async def get(self, model, key):
        return self.existing_wallet

    async def execute(self, statement):
        return FakeWalletCrudResult(self.first_wallet)

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        self.commits += 1

    async def refresh(self, obj):
        self.refreshed.append(obj)


def wallet_payload(address="0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD"):
    return WalletCreate(
        address=address,
        signature="signature",
        message="message",
        nonce="NonceValue123",
        chain_id=11155111,
        ens_name=None,
    )


def test_add_wallet_marks_first_wallet_primary(monkeypatch):
    async def fake_add_audit(db, user_id, action, meta):
        db.audit = (user_id, action, meta)

    monkeypatch.setattr(wallet_crud, "_add_audit", fake_add_audit)
    db = FakeWalletCrudDb(first_wallet=None)

    result = asyncio.run(wallet_crud.add_wallet(db, "user-123", wallet_payload()))

    assert result.address == "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
    assert result.is_primary is True
    assert db.commits == 1
    assert db.refreshed == [result]
    assert db.audit[2]["is_primary"] is True


def test_add_wallet_marks_later_wallet_non_primary(monkeypatch):
    async def fake_add_audit(db, user_id, action, meta):
        db.audit = (user_id, action, meta)

    monkeypatch.setattr(wallet_crud, "_add_audit", fake_add_audit)
    db = FakeWalletCrudDb(first_wallet=object())

    result = asyncio.run(wallet_crud.add_wallet(db, "user-123", wallet_payload()))

    assert result.is_primary is False
    assert db.audit[2]["is_primary"] is False


def test_add_wallet_rejects_wallet_linked_to_another_user():
    db = FakeWalletCrudDb(existing_wallet=SimpleNamespace(user_id="other-user"))

    try:
        asyncio.run(wallet_crud.add_wallet(db, "user-123", wallet_payload()))
    except ValueError as exc:
        assert "another user" in str(exc).lower()
    else:
        raise AssertionError("add_wallet should reject wallets owned by another user")
