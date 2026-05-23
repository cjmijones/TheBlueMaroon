# app/api/routes_nfts.py
from pathlib import Path
import json, shutil, uuid

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import get_settings
from app.auth.deps   import get_current_user, get_db
from app.models import AppAsset

settings = get_settings()
router   = APIRouter(prefix="/nfts", tags=["nfts"])


# ──────────────────────────────
# Pydantic schema + helper
# ──────────────────────────────
class MetadataIn(BaseModel):
    name:        str = Field(..., max_length=80, strip_whitespace=True)
    description: str = Field(..., max_length=5_000, strip_whitespace=True)
    chain_id: int | None = None
    nft_contract: str | None = Field(None, pattern=r"^0x[a-fA-F0-9]{40}$")
    owner_wallet_address: str | None = Field(None, pattern=r"^0x[a-fA-F0-9]{40}$")

    # turn every field into Form(...) so FastAPI binds it from multipart
    @classmethod
    def as_form(
        cls,
        name:        str = Form(...),
        description: str = Form(...),
        chain_id: int | None = Form(None),
        nft_contract: str | None = Form(None),
        owner_wallet_address: str | None = Form(None),
    ):
        return cls(
            name=name,
            description=description,
            chain_id=chain_id,
            nft_contract=nft_contract,
            owner_wallet_address=owner_wallet_address,
        )


class MintedAssetIn(BaseModel):
    tx_hash: str = Field(..., pattern=r"^0x[a-fA-F0-9]{64}$")
    token_id: str | None = None
    nft_contract: str | None = Field(None, pattern=r"^0x[a-fA-F0-9]{40}$")
    owner_wallet_address: str | None = Field(None, pattern=r"^0x[a-fA-F0-9]{40}$")
    chain_id: int | None = None


# ──────────────────────────────
# Route
# ──────────────────────────────
@router.post("/metadata")
async def upload_metadata(
    request: Request,
    image:   UploadFile               = File(...),
    payload: MetadataIn               = Depends(MetadataIn.as_form),
    db: AsyncSession                   = Depends(get_db),
    user     = Depends(get_current_user),
):
    """
    1. Store image + metadata under ./media/nfts
    2. Build absolute token URI based on PUBLIC_BASE_URL (or request.host).
    3. Return {"token_uri": "...", "image_url": "..."}.
    """

    # 1️⃣  save image ---------------------------------------------------
    folder = Path("media") / "nfts"
    folder.mkdir(parents=True, exist_ok=True)

    img_name = f"{uuid.uuid4()}{Path(image.filename).suffix}"
    img_path = folder / img_name
    with img_path.open("wb") as f:
        shutil.copyfileobj(image.file, f)

    # 2️⃣  build URLs ---------------------------------------------------
    host = settings.public_base_url or str(request.base_url).rstrip("/")
    image_url = f"{host}/media/nfts/{img_name}"
    meta_name = f"{Path(img_name).stem}.json"
    token_uri = f"{host}/media/nfts/{meta_name}"

    # 3️⃣  write metadata ----------------------------------------------
    (folder / meta_name).write_text(json.dumps({
        "name":        payload.name,
        "description": payload.description,
        "image":       image_url,
    }))

    app_asset = AppAsset(
        creator_id=user.id,
        owner_wallet_address=payload.owner_wallet_address.lower() if payload.owner_wallet_address else None,
        chain_id=payload.chain_id,
        nft_contract=payload.nft_contract.lower() if payload.nft_contract else None,
        title=payload.name,
        description=payload.description,
        metadata_uri=token_uri,
        image_url=image_url,
        status="metadata_ready",
    )
    db.add(app_asset)
    await db.commit()
    await db.refresh(app_asset)

    return {
        "asset_id": app_asset.id,
        "token_uri": token_uri,
        "image_url": image_url,
    }


@router.patch("/assets/{asset_id}/minted")
async def mark_asset_minted(
    asset_id: int,
    payload: MintedAssetIn,
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_user),
):
    app_asset = await db.get(AppAsset, asset_id)
    if not app_asset or app_asset.creator_id != user.id:
        raise HTTPException(status_code=404, detail="Asset not found")

    app_asset.status = "mint_submitted"
    app_asset.mint_tx_hash = payload.tx_hash.lower()
    if payload.token_id is not None:
        app_asset.token_id = payload.token_id
        app_asset.status = "minted"
    if payload.nft_contract:
        app_asset.nft_contract = payload.nft_contract.lower()
    if payload.owner_wallet_address:
        app_asset.owner_wallet_address = payload.owner_wallet_address.lower()
    if payload.chain_id:
        app_asset.chain_id = payload.chain_id

    await db.commit()
    await db.refresh(app_asset)

    return {
        "id": app_asset.id,
        "status": app_asset.status,
        "mint_tx_hash": app_asset.mint_tx_hash,
        "token_id": app_asset.token_id,
    }
