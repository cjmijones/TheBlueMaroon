from io import BytesIO
from pathlib import Path
import asyncio

import pytest
from fastapi import HTTPException

from app.api import routes_nfts


class FakeUploadFile:
    def __init__(self, content_type: str, data: bytes = b"image-bytes", filename: str = "upload.png"):
        self.content_type = content_type
        self.filename = filename
        self.file = BytesIO(data)

    async def read(self, size: int = -1):
        return self.file.read(size)

    async def seek(self, position: int):
        self.file.seek(position)


class FakeResult:
    def __init__(self, wallet=None):
        self._wallet = wallet

    def scalar_one_or_none(self):
        return self._wallet


class FakeDB:
    def __init__(self, wallet=None):
        self.wallet = wallet
        self.added = []
        self.committed = False
        self.refreshed = []

    async def execute(self, stmt):
        return FakeResult(self.wallet)

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        self.committed = True

    async def refresh(self, obj):
        if getattr(obj, "id", None) is None:
            obj.id = 1
        self.refreshed.append(obj)

    async def get(self, model, asset_id):
        if getattr(self, "asset", None) and self.asset.id == asset_id:
            return self.asset
        return None


def allow_creator_kyc(monkeypatch):
    async def fake_require_creator_kyc_ready(db_arg, user_id):
        return object()

    monkeypatch.setattr(
        routes_nfts,
        "require_creator_kyc_ready",
        fake_require_creator_kyc_ready,
        raising=False,
    )


def _make_asset(asset_id=7, creator_id="user-1"):
    return type(
        "Asset",
        (),
        {
            "id": asset_id,
            "creator_id": creator_id,
            "status": "metadata_ready",
            "mint_tx_hash": None,
            "token_id": None,
            "nft_contract": None,
            "owner_wallet_address": None,
            "chain_id": None,
        },
    )()


def test_safe_suffix_accepts_png_jpeg_webp():
    assert routes_nfts.safe_nft_image_suffix(FakeUploadFile("image/png")) == ".png"
    assert routes_nfts.safe_nft_image_suffix(FakeUploadFile("image/jpeg")) == ".jpg"
    assert routes_nfts.safe_nft_image_suffix(FakeUploadFile("image/webp")) == ".webp"


def test_safe_suffix_rejects_unknown_type():
    with pytest.raises(HTTPException) as exc_info:
        routes_nfts.safe_nft_image_suffix(FakeUploadFile("image/tiff"))
    assert exc_info.value.status_code == 415


def test_large_upload_rejects(monkeypatch):
    monkeypatch.setattr(routes_nfts.settings, "nft_max_image_bytes", 3)
    image = FakeUploadFile("image/png", b"1234")

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(routes_nfts.validate_nft_image_upload(image))

    assert exc_info.value.status_code == 413


def test_empty_upload_rejects(monkeypatch):
    image = FakeUploadFile("image/png", b"")

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(routes_nfts.validate_nft_image_upload(image))

    assert exc_info.value.status_code == 400
    assert "empty" in str(exc_info.value.detail).lower()


def test_nft_media_folder_honors_settings(monkeypatch):
    monkeypatch.setattr(routes_nfts.settings, "media_root", "custom-media")
    assert routes_nfts.nft_media_folder() == Path("custom-media") / "nfts"


def test_upload_metadata_creates_one_asset_and_two_media_files(monkeypatch, tmp_path):
    monkeypatch.setattr(routes_nfts.settings, "media_root", str(tmp_path))
    monkeypatch.setattr(routes_nfts.settings, "public_base_url", "http://example.test")
    monkeypatch.setattr(routes_nfts.uuid, "uuid4", lambda: "12345678-1234-1234-1234-123456789abc")

    wallet = object()
    db = FakeDB(wallet=wallet)
    user = type("User", (), {"id": "user-1"})()
    payload = routes_nfts.MetadataIn(
        name="Creator Mint",
        description="desc",
        owner_wallet_address="0x1234567890abcdef1234567890abcdef12345678",
    )
    image = FakeUploadFile("image/png", b"image-bytes", "upload.png")

    guard_calls = []

    async def fake_require_creator_action_ready(db_arg, user_id, address):
        guard_calls.append((db_arg, user_id, address))
        assert db_arg is db
        assert user_id == user.id
        assert address == payload.owner_wallet_address
        return wallet

    monkeypatch.setattr(
        routes_nfts,
        "require_creator_action_ready",
        fake_require_creator_action_ready,
        raising=False,
    )

    result = asyncio.run(
        routes_nfts.upload_metadata(
            request=type("Request", (), {"base_url": "http://request.example/"})(),
            image=image,
            payload=payload,
            db=db,
            user=user,
        )
    )

    assert result["asset_id"] == 1
    assert guard_calls == [(db, "user-1", payload.owner_wallet_address)]
    assert result["token_uri"] == "http://example.test/media/nfts/12345678-1234-1234-1234-123456789abc.json"
    assert result["image_url"] == "http://example.test/media/nfts/12345678-1234-1234-1234-123456789abc.png"
    assert len(db.added) == 1
    assert db.committed is True
    assert (tmp_path / "nfts" / "12345678-1234-1234-1234-123456789abc.png").exists()
    assert (tmp_path / "nfts" / "12345678-1234-1234-1234-123456789abc.json").exists()


def test_upload_metadata_rejects_when_kyc_is_not_clear(monkeypatch):
    db = FakeDB(wallet=object())
    user = type("User", (), {"id": "user-1"})()
    payload = routes_nfts.MetadataIn(
        name="Creator Mint",
        description="desc",
        owner_wallet_address="0x1234567890abcdef1234567890abcdef12345678",
    )
    image = FakeUploadFile("image/png")

    async def fake_require_creator_action_ready(db_arg, user_id, address):
        raise HTTPException(status_code=403, detail="KYC verification is required")

    monkeypatch.setattr(
        routes_nfts,
        "require_creator_action_ready",
        fake_require_creator_action_ready,
        raising=False,
    )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            routes_nfts.upload_metadata(
                request=type("Request", (), {"base_url": "http://request.example/"})(),
                image=image,
                payload=payload,
                db=db,
                user=user,
            )
        )

    assert exc_info.value.status_code == 403
    assert "kyc" in str(exc_info.value.detail).lower()


def test_mark_asset_minted_sets_status_and_token_id(monkeypatch):
    allow_creator_kyc(monkeypatch)
    asset = _make_asset()
    db = FakeDB()
    db.asset = asset
    user = type("User", (), {"id": "user-1"})()
    payload = routes_nfts.MintedAssetIn(
        tx_hash="0x" + "a" * 64,
        token_id="42",
        status="minted",
    )

    result = asyncio.run(routes_nfts.mark_asset_minted(asset_id=7, payload=payload, db=db, user=user))

    assert result["status"] == "minted"
    assert result["token_id"] == "42"
    assert asset.status == "minted"
    assert asset.mint_tx_hash == "0x" + "a" * 64
    assert asset.token_id == "42"


def test_mark_asset_minted_rejects_minted_without_token_id(monkeypatch):
    allow_creator_kyc(monkeypatch)
    asset = _make_asset()
    db = FakeDB()
    db.asset = asset
    user = type("User", (), {"id": "user-1"})()
    payload = routes_nfts.MintedAssetIn(
        tx_hash="0x" + "c" * 64,
        status="minted",
    )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(routes_nfts.mark_asset_minted(asset_id=7, payload=payload, db=db, user=user))

    assert exc_info.value.status_code == 400


def test_mark_asset_minted_allows_mint_failed_without_token_id(monkeypatch):
    allow_creator_kyc(monkeypatch)
    asset = _make_asset()
    db = FakeDB()
    db.asset = asset
    user = type("User", (), {"id": "user-1"})()
    payload = routes_nfts.MintedAssetIn(
        tx_hash="0x" + "b" * 64,
        status="mint_failed",
    )

    result = asyncio.run(routes_nfts.mark_asset_minted(asset_id=7, payload=payload, db=db, user=user))

    assert result["status"] == "mint_failed"
    assert result["token_id"] is None
    assert asset.status == "mint_failed"


def test_mark_asset_minted_rejects_when_kyc_is_not_clear(monkeypatch):
    asset = _make_asset()
    db = FakeDB()
    db.asset = asset
    user = type("User", (), {"id": "user-1"})()
    payload = routes_nfts.MintedAssetIn(
        tx_hash="0x" + "d" * 64,
        token_id="42",
        status="minted",
    )

    async def fake_require_creator_kyc_ready(db_arg, user_id):
        raise HTTPException(status_code=403, detail="KYC verification is required")

    monkeypatch.setattr(
        routes_nfts,
        "require_creator_kyc_ready",
        fake_require_creator_kyc_ready,
        raising=False,
    )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(routes_nfts.mark_asset_minted(asset_id=7, payload=payload, db=db, user=user))

    assert exc_info.value.status_code == 403
    assert "kyc" in str(exc_info.value.detail).lower()
