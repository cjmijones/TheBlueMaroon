from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.auth.deps import get_current_user
from app.db.session import get_db
from pathlib import Path
import uuid, shutil

router = APIRouter(prefix="/nfts", tags=["nfts"])

@router.post("/metadata")
async def upload_metadata(
    name: str,
    description: str,
    image: UploadFile = File(...),
    user = Depends(get_current_user),
):
    """Store metadata + image locally (or S3/IPFS) and return tokenURI."""
    folder = Path("media") / "nfts"
    folder.mkdir(parents=True, exist_ok=True)
    img_path = folder / f"{uuid.uuid4()}{Path(image.filename).suffix}"
    with img_path.open("wb") as f:
        shutil.copyfileobj(image.file, f)

    token_uri = f"https://api.thebluemaroon.com/media/nfts/{img_path.name}"

    meta = {
        "name": name,
        "description": description,
        "image": token_uri,
    }
    meta_path = folder / f"{img_path.stem}.json"
    meta_path.write_text(json.dumps(meta))

    return {"token_uri": f"https://api.thebluemaroon.com/media/nfts/{meta_path.name}"}
