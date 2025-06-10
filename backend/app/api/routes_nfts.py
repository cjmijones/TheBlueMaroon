# app/api/routes_nfts.py
from pathlib import Path
import json, shutil, uuid

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile, HTTPException
from pydantic import BaseModel, Field
from app.core.config import get_settings
from app.auth.deps   import get_current_user

settings = get_settings()
router   = APIRouter(prefix="/nfts", tags=["nfts"])


# ──────────────────────────────
# Pydantic schema + helper
# ──────────────────────────────
class MetadataIn(BaseModel):
    name:        str = Field(..., max_length=80, strip_whitespace=True)
    description: str = Field(..., max_length=5_000, strip_whitespace=True)

    # turn every field into Form(...) so FastAPI binds it from multipart
    @classmethod
    def as_form(
        cls,
        name:        str = Form(...),
        description: str = Form(...),
    ):
        return cls(name=name, description=description)


# ──────────────────────────────
# Route
# ──────────────────────────────
@router.post("/metadata")
async def upload_metadata(
    request: Request,
    image:   UploadFile               = File(...),
    payload: MetadataIn               = Depends(MetadataIn.as_form),
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

    return {"token_uri": token_uri, "image_url": image_url}
