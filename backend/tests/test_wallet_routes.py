import asyncio

from app.api import routes_wallets


def test_unlink_wallet_awaits_async_crud_call(monkeypatch):
    calls = []

    async def fake_remove_wallet(db, user_id, address):
        calls.append((db, user_id, address))

    monkeypatch.setattr(routes_wallets.crud, "remove_wallet", fake_remove_wallet)

    db = object()
    user = type("User", (), {"id": "user-123"})()

    asyncio.run(routes_wallets.unlink_wallet("0xABC", db=db, user=user))

    assert calls == [(db, "user-123", "0xABC")]
