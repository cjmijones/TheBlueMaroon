import json
import shutil
import uuid
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.creator_actions import require_creator_action_ready, require_creator_kyc_ready
from app.auth.deps import get_current_user, get_db
from app.core.config import get_settings
from app.models import AppAsset, Wallet

settings = get_settings()
router = APIRouter(prefix="/nfts", tags=["nfts"])

IMAGE_SUFFIX_BY_TYPE = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


class MetadataIn(BaseModel):
    name: str = Field(..., max_length=80, strip_whitespace=True)
    description: str = Field(..., max_length=5_000, strip_whitespace=True)
    chain_id: int | None = None
    nft_contract: str | None = Field(None, pattern=r"^0x[a-fA-F0-9]{40}$")
    owner_wallet_address: str | None = Field(None, pattern=r"^0x[a-fA-F0-9]{40}$")

    @classmethod
    def as_form(
        cls,
        name: str = Form(...),
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
    status: Literal["mint_submitted", "minted", "mint_failed"] = "mint_submitted"


async def require_linked_wallet(db: AsyncSession, user_id: str, address: str | None) -> Wallet:
    if not address:
        raise HTTPException(status_code=403, detail="Linked wallet is required")

    result = await db.execute(
        select(Wallet).where(
            Wallet.user_id == user_id,
            Wallet.address == address.lower(),
        )
    )
    wallet = result.scalar_one_or_none()
    if not wallet:
        raise HTTPException(status_code=403, detail="Wallet is not linked to this account")
    return wallet


def nft_media_folder() -> Path:
    return Path(settings.media_root) / "nfts"


def safe_nft_image_suffix(image: UploadFile) -> str:
    image_type = image.content_type or ""
    suffix = IMAGE_SUFFIX_BY_TYPE.get(image_type)
    if not suffix:
        raise HTTPException(status_code=415, detail="Unsupported NFT image type")
    return suffix


async def validate_nft_image_upload(image: UploadFile) -> None:
    if image.content_type not in settings.nft_allowed_image_types:
        raise HTTPException(status_code=415, detail="Unsupported NFT image type")
    contents = await image.read(settings.nft_max_image_bytes + 1)
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="NFT image upload is empty")
    if len(contents) > settings.nft_max_image_bytes:
        raise HTTPException(status_code=413, detail="NFT image exceeds maximum size")
    await image.seek(0)


@router.post("/metadata")
async def upload_metadata(
    request: Request,
    image: UploadFile = File(...),
    payload: MetadataIn = Depends(MetadataIn.as_form),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    await require_creator_action_ready(db, user.id, payload.owner_wallet_address)
    await validate_nft_image_upload(image)

    folder = nft_media_folder()
    folder.mkdir(parents=True, exist_ok=True)

    img_name = f"{uuid.uuid4()}{safe_nft_image_suffix(image)}"
    img_path = folder / img_name
    with img_path.open("wb") as f:
        shutil.copyfileobj(image.file, f)

    host = settings.public_base_url or str(request.base_url).rstrip("/")
    image_url = f"{host}/media/nfts/{img_name}"
    meta_name = f"{Path(img_name).stem}.json"
    token_uri = f"{host}/media/nfts/{meta_name}"

    (folder / meta_name).write_text(
        json.dumps(
            {
                "name": payload.name,
                "description": payload.description,
                "image": image_url,
            }
        )
    )

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
    user=Depends(get_current_user),
):
    app_asset = await db.get(AppAsset, asset_id)
    if not app_asset or app_asset.creator_id != user.id:
        raise HTTPException(status_code=404, detail="Asset not found")
    if payload.owner_wallet_address:
        await require_creator_action_ready(db, user.id, payload.owner_wallet_address)
    else:
        await require_creator_kyc_ready(db, user.id)
    if payload.status == "minted" and payload.token_id is None:
        raise HTTPException(status_code=400, detail="token_id is required when status is minted")

    app_asset.status = payload.status
    app_asset.mint_tx_hash = payload.tx_hash.lower()
    if payload.token_id is not None:
        app_asset.token_id = payload.token_id
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
