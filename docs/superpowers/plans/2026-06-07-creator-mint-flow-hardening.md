# Creator Mint Flow Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make creator NFT minting reliable end to end: validated image upload, intentional media serving, clear wallet/chain/readiness states, transaction lifecycle bookkeeping, and real contract tests.

**Architecture:** Keep this as an MVP hardening slice, not a storage-provider migration. FastAPI will intentionally serve local NFT media from `/media` with upload guardrails, while the frontend owns creator-facing validation and mint transaction stages. Contract coverage replaces the template `Lock` suite with `BluemaroonNFT` tests so the mint path has chain-level confidence.

**Tech Stack:** FastAPI, Pydantic settings, async SQLAlchemy route tests, React 19, wagmi/viem, TanStack Query, Hardhat, ethers v6, Chai.

**Workspace Preference:** Do not run or include git commands. Use file edits, focused verification, and update `AGENT_TODO.md` after implementation.

---

## File Structure

- Modify `backend/app/core/config.py`
  - Add media upload settings: media root, max NFT image bytes, and allowed image content types.
- Modify `backend/app/main.py`
  - Mount `/media` with FastAPI `StaticFiles` so existing NFT `image_url` and `token_uri` values resolve intentionally.
- Modify `backend/app/api/routes_nfts.py`
  - Add upload validation helpers, safe file extension handling, media path helper, and mint status update support.
- Create `backend/tests/test_nft_routes.py`
  - Add focused route/helper tests for upload validation, app asset creation, linked-wallet enforcement, media output, and mint status patching.
- Create `frontend/src/components/NFTS/mintValidation.ts`
  - Centralize frontend image validation and mint error normalization.
- Create `frontend/src/lib/mintTransaction.ts`
  - Extract token id from the mint receipt and build explorer URLs.
- Modify `frontend/src/hooks/useMintNft.tsx`
  - Add explicit mint stages, transaction receipt waiting, transaction status updates, and token id patching.
- Modify `frontend/src/components/NFTS/MintNftCard.tsx`
  - Show file validation, mint lifecycle state, and clearer disabled/readiness messaging.
- Replace `test/Lock.ts` with `test/BluemaroonNFT.ts`
  - Remove template contract tests and test the real NFT contract.
- Modify `AGENT_TODO.md`
  - Move completed NFT minting tasks forward and record any remaining follow-up.

---

## Subagent Assignment

- **Backend Media + NFT Routes:** Tier 1 narrow backend agent, low reasoning, focused only on `backend/app/core/config.py`, `backend/app/main.py`, `backend/app/api/routes_nfts.py`, and `backend/tests/test_nft_routes.py`.
- **Frontend Mint UX:** Tier 1 or Tier 2 frontend agent, medium reasoning because user-facing state and wagmi receipt parsing are involved.
- **Contract Test Replacement:** Tier 1 contract agent, low reasoning, focused only on Hardhat tests.
- **Final Review:** Orchestrator review only unless the implementation touches unexpected auth/wallet behavior. Run focused verification before broader checks.

---

## Task 1: Backend Media Serving And Upload Guardrails

**Files:**
- Modify: `backend/app/core/config.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/api/routes_nfts.py`
- Test: `backend/tests/test_nft_routes.py`

- [ ] **Step 1: Add failing backend tests for media settings and upload validation**

Create `backend/tests/test_nft_routes.py` with these initial tests:

```python
from io import BytesIO
from pathlib import Path

import pytest
from fastapi import HTTPException, UploadFile

from app.api import routes_nfts


def make_upload(filename: str, content_type: str, body: bytes) -> UploadFile:
    return UploadFile(filename=filename, file=BytesIO(body), headers={"content-type": content_type})


def test_safe_nft_image_suffix_accepts_known_image_types():
    assert routes_nfts.safe_nft_image_suffix(make_upload("cover.png", "image/png", b"png")) == ".png"
    assert routes_nfts.safe_nft_image_suffix(make_upload("cover.jpeg", "image/jpeg", b"jpg")) == ".jpg"
    assert routes_nfts.safe_nft_image_suffix(make_upload("cover.webp", "image/webp", b"webp")) == ".webp"


def test_safe_nft_image_suffix_rejects_unknown_type():
    with pytest.raises(HTTPException) as exc:
        routes_nfts.safe_nft_image_suffix(make_upload("cover.svg", "image/svg+xml", b"<svg />"))

    assert exc.value.status_code == 415
    assert "Unsupported image type" in exc.value.detail


@pytest.mark.asyncio
async def test_validate_nft_image_size_rejects_large_upload(monkeypatch):
    monkeypatch.setattr(routes_nfts.settings, "nft_max_image_bytes", 4)

    with pytest.raises(HTTPException) as exc:
        await routes_nfts.validate_nft_image_upload(make_upload("large.png", "image/png", b"12345"))

    assert exc.value.status_code == 413
    assert "too large" in exc.value.detail.lower()


def test_nft_media_folder_uses_settings_media_root(monkeypatch, tmp_path):
    monkeypatch.setattr(routes_nfts.settings, "media_root", str(tmp_path / "media"))
    folder = routes_nfts.nft_media_folder()

    assert folder == tmp_path / "media" / "nfts"
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
.\backend\venv\Scripts\pytest.exe backend/tests/test_nft_routes.py -q
```

Expected: FAIL because `safe_nft_image_suffix`, `validate_nft_image_upload`, `nft_media_folder`, and media settings do not exist yet.

- [ ] **Step 3: Add media settings**

In `backend/app/core/config.py`, add these fields below `public_base_url`:

```python
    media_root: str = "media"
    nft_max_image_bytes: int = 10 * 1024 * 1024
    nft_allowed_image_types: List[str] = ["image/png", "image/jpeg", "image/webp", "image/gif"]
```

- [ ] **Step 4: Mount `/media` intentionally**

In `backend/app/main.py`, add this after `app.include_router(api_router)` and before SPA static assets:

```python
MEDIA_DIR = Path(settings.media_root)
app.mount("/media", StaticFiles(directory=MEDIA_DIR, check_dir=False), name="media")
```

This allows existing URLs like `http://localhost:8000/media/nfts/<file>` to resolve in local and Docker MVP runs.

- [ ] **Step 5: Add upload validation helpers**

In `backend/app/api/routes_nfts.py`, replace `import json, shutil, uuid` with separate imports and add these helpers above `MetadataIn`:

```python
import json
import shutil
import uuid


IMAGE_SUFFIX_BY_TYPE = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


def nft_media_folder() -> Path:
    return Path(settings.media_root) / "nfts"


def safe_nft_image_suffix(image: UploadFile) -> str:
    content_type = (image.content_type or "").lower()
    if content_type not in settings.nft_allowed_image_types:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported image type: {content_type or 'unknown'}",
        )
    return IMAGE_SUFFIX_BY_TYPE[content_type]


async def validate_nft_image_upload(image: UploadFile) -> None:
    image.file.seek(0, 2)
    size = image.file.tell()
    image.file.seek(0)
    if size <= 0:
        raise HTTPException(status_code=400, detail="Image file is empty")
    if size > settings.nft_max_image_bytes:
        raise HTTPException(status_code=413, detail="Image file is too large")
```

- [ ] **Step 6: Use helpers in metadata upload**

In `upload_metadata`, replace the current folder and filename block with:

```python
    await require_linked_wallet(db, user.id, payload.owner_wallet_address)
    await validate_nft_image_upload(image)

    folder = nft_media_folder()
    folder.mkdir(parents=True, exist_ok=True)

    img_name = f"{uuid.uuid4()}{safe_nft_image_suffix(image)}"
    img_path = folder / img_name
    with img_path.open("wb") as f:
        shutil.copyfileobj(image.file, f)
```

- [ ] **Step 7: Run backend test to verify it passes**

Run:

```powershell
.\backend\venv\Scripts\pytest.exe backend/tests/test_nft_routes.py -q
```

Expected: PASS for the helper tests.

---

## Task 2: Backend NFT Asset Lifecycle Tests And Mint Status Patch

**Files:**
- Modify: `backend/app/api/routes_nfts.py`
- Modify: `backend/tests/test_nft_routes.py`

- [ ] **Step 1: Add failing tests for app asset creation and status patching**

Append these test helpers and tests to `backend/tests/test_nft_routes.py`:

```python
class FakeResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class FakeDb:
    def __init__(self, linked_wallet=None, asset=None):
        self.linked_wallet = linked_wallet
        self.asset = asset
        self.added = []
        self.commits = 0
        self.refreshed = []

    async def execute(self, _stmt):
        return FakeResult(self.linked_wallet)

    async def get(self, _model, _id):
        return self.asset

    def add(self, obj):
        obj.id = 42
        self.added.append(obj)

    async def commit(self):
        self.commits += 1

    async def refresh(self, obj):
        self.refreshed.append(obj)


class FakeRequest:
    base_url = "http://testserver/"


class FakeUser:
    id = "user-123"


@pytest.mark.asyncio
async def test_upload_metadata_creates_asset_and_media_files(monkeypatch, tmp_path):
    monkeypatch.setattr(routes_nfts.settings, "media_root", str(tmp_path / "media"))
    wallet = type("Wallet", (), {"address": "0xabc"})()
    db = FakeDb(linked_wallet=wallet)
    payload = routes_nfts.MetadataIn(
        name="Test NFT",
        description="Mint me",
        chain_id=11155111,
        nft_contract="0x1111111111111111111111111111111111111111",
        owner_wallet_address="0x2222222222222222222222222222222222222222",
    )

    result = await routes_nfts.upload_metadata(
        request=FakeRequest(),
        image=make_upload("cover.png", "image/png", b"image-bytes"),
        payload=payload,
        db=db,
        user=FakeUser(),
    )

    assert result["asset_id"] == 42
    assert result["token_uri"].startswith("http://localhost:8000/media/nfts/")
    assert result["image_url"].startswith("http://localhost:8000/media/nfts/")
    assert len(db.added) == 1
    assert db.added[0].status == "metadata_ready"
    assert db.added[0].owner_wallet_address == "0x2222222222222222222222222222222222222222"
    assert len(list((tmp_path / "media" / "nfts").iterdir())) == 2


@pytest.mark.asyncio
async def test_upload_metadata_requires_linked_wallet(monkeypatch, tmp_path):
    monkeypatch.setattr(routes_nfts.settings, "media_root", str(tmp_path / "media"))
    db = FakeDb(linked_wallet=None)
    payload = routes_nfts.MetadataIn(
        name="Test NFT",
        description="Mint me",
        owner_wallet_address="0x2222222222222222222222222222222222222222",
    )

    with pytest.raises(HTTPException) as exc:
        await routes_nfts.upload_metadata(
            request=FakeRequest(),
            image=make_upload("cover.png", "image/png", b"image-bytes"),
            payload=payload,
            db=db,
            user=FakeUser(),
        )

    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_mark_asset_minted_sets_mined_status_and_token_id():
    asset = type(
        "Asset",
        (),
        {
            "id": 42,
            "creator_id": "user-123",
            "status": "mint_submitted",
            "mint_tx_hash": None,
            "token_id": None,
            "nft_contract": None,
            "owner_wallet_address": None,
            "chain_id": None,
        },
    )()
    db = FakeDb(linked_wallet=type("Wallet", (), {"address": "0xabc"})(), asset=asset)
    payload = routes_nfts.MintedAssetIn(
        tx_hash="0x" + "a" * 64,
        token_id="7",
        status="minted",
        owner_wallet_address="0x2222222222222222222222222222222222222222",
        chain_id=11155111,
        nft_contract="0x1111111111111111111111111111111111111111",
    )

    result = await routes_nfts.mark_asset_minted(42, payload, db=db, user=FakeUser())

    assert result["status"] == "minted"
    assert result["token_id"] == "7"
    assert asset.owner_wallet_address == "0x2222222222222222222222222222222222222222"


@pytest.mark.asyncio
async def test_mark_asset_minted_allows_failed_status_without_token_id():
    asset = type(
        "Asset",
        (),
        {
            "id": 42,
            "creator_id": "user-123",
            "status": "metadata_ready",
            "mint_tx_hash": None,
            "token_id": None,
            "nft_contract": None,
            "owner_wallet_address": None,
            "chain_id": None,
        },
    )()
    db = FakeDb(asset=asset)
    payload = routes_nfts.MintedAssetIn(tx_hash="0x" + "b" * 64, status="mint_failed")

    result = await routes_nfts.mark_asset_minted(42, payload, db=db, user=FakeUser())

    assert result["status"] == "mint_failed"
    assert result["token_id"] is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
.\backend\venv\Scripts\pytest.exe backend/tests/test_nft_routes.py -q
```

Expected: FAIL because `MintedAssetIn.status` is not defined and `mark_asset_minted` does not handle failed status.

- [ ] **Step 3: Add mint status to the backend schema**

In `backend/app/api/routes_nfts.py`, import `Literal`:

```python
from typing import Literal
```

Then add this field to `MintedAssetIn`:

```python
    status: Literal["mint_submitted", "minted", "mint_failed"] = "mint_submitted"
```

- [ ] **Step 4: Update status patching rules**

In `mark_asset_minted`, replace the status/token block with:

```python
    if payload.status == "minted" and payload.token_id is None:
        raise HTTPException(status_code=400, detail="token_id is required for minted assets")

    app_asset.status = payload.status
    app_asset.mint_tx_hash = payload.tx_hash.lower()
    if payload.token_id is not None:
        app_asset.token_id = payload.token_id
```

Keep the existing contract, wallet, and chain updates after this block.

- [ ] **Step 5: Run focused backend tests**

Run:

```powershell
.\backend\venv\Scripts\pytest.exe backend/tests/test_nft_routes.py backend/tests/test_wallet_routes.py -q
```

Expected: PASS.

---

## Task 3: Frontend Mint Validation And User-Facing Form State

**Files:**
- Create: `frontend/src/components/NFTS/mintValidation.ts`
- Modify: `frontend/src/components/NFTS/MintNftCard.tsx`

- [ ] **Step 1: Create the validation helper**

Create `frontend/src/components/NFTS/mintValidation.ts`:

```ts
export const NFT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export function validateMintImage(file?: File): string | null {
  if (!file) return "Choose an image before minting.";
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Use a PNG, JPEG, WebP, or GIF image.";
  }
  if (file.size <= 0) return "The selected image is empty.";
  if (file.size > NFT_IMAGE_MAX_BYTES) return "Images must be 10 MB or smaller.";
  return null;
}

export function normalizeMintError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Mint failed. Check your wallet and try again.";
}
```

- [ ] **Step 2: Wire validation into `MintNftCard`**

In `frontend/src/components/NFTS/MintNftCard.tsx`, import the helper:

```ts
import { normalizeMintError, validateMintImage } from "./mintValidation";
```

Add local validation state:

```ts
  const [file, setFile] = useState<File>();
  const fileError = validateMintImage(file);
  const canSubmit = isReady && !isPending && !fileError;
```

Update `onSubmit`:

```ts
    const validationError = validateMintImage(file);
    if (validationError) return;
```

Update `FileInput`:

```tsx
          <FileInput
            name="image"
            accept="image/png,image/jpeg,image/webp,image/gif"
            required
            onChange={(e) => setFile(e.target.files?.[0])}
            disabled={!isReady || isPending}
            className="col-span-2 w-full"
          />
```

Add this below the `FileInput`:

```tsx
          {fileError && (
            <p className="col-span-2 text-sm text-red-600 dark:text-red-300">
              {fileError}
            </p>
          )}
```

Update the submit button:

```tsx
        <Button
          type="submit"
          disabled={!canSubmit}
          className="w-full sm:w-auto"
        >
          {isPending ? "Minting..." : "Mint NFT"}
        </Button>
```

- [ ] **Step 3: Add mutation error copy**

Where the hook result is destructured, include `error`:

```ts
  const { mutateAsync, isPending, isReady, errorMsg, walletControl, error } = useMintNft();
```

Show it below the readiness warning:

```tsx
        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
            {normalizeMintError(error)}
          </p>
        )}
```

- [ ] **Step 4: Run frontend verification**

Run:

```powershell
Set-Location frontend
npm run build
npm run lint
```

Expected: build PASS and lint PASS with only existing Fast Refresh warnings, if any.

---

## Task 4: Mint Transaction Lifecycle And Token ID Extraction

**Files:**
- Create: `frontend/src/lib/mintTransaction.ts`
- Modify: `frontend/src/hooks/useMintNft.tsx`

- [ ] **Step 1: Create mint transaction helpers**

Create `frontend/src/lib/mintTransaction.ts`:

```ts
import { decodeEventLog, getAddress, zeroAddress, type TransactionReceipt } from "viem";

import NFT_ABI from "../abi/BluemaroonNFT.json";

export type MintStage =
  | "idle"
  | "uploading_metadata"
  | "opening_wallet"
  | "submitted"
  | "confirming"
  | "bookkeeping"
  | "mined"
  | "failed";

export const mintStageLabels: Record<MintStage, string> = {
  idle: "Ready to mint",
  uploading_metadata: "Uploading metadata",
  opening_wallet: "Waiting for wallet confirmation",
  submitted: "Transaction submitted",
  confirming: "Waiting for network confirmation",
  bookkeeping: "Updating app records",
  mined: "Mint complete",
  failed: "Mint failed",
};

export function getExplorerTxUrl(chainId: number, txHash: string): string {
  const baseUrl = chainId === 11155111 ? "https://sepolia.etherscan.io/tx/" : "https://etherscan.io/tx/";
  return `${baseUrl}${txHash}`;
}

export function extractMintedTokenId(
  receipt: TransactionReceipt,
  nftAddress: string,
  ownerAddress?: string,
): string | null {
  const targetNft = getAddress(nftAddress);
  const targetOwner = ownerAddress ? getAddress(ownerAddress) : null;

  for (const log of receipt.logs) {
    if (getAddress(log.address) !== targetNft) continue;

    try {
      const decoded = decodeEventLog({
        abi: NFT_ABI,
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName !== "Transfer") continue;

      const args = decoded.args as { from?: string; to?: string; tokenId?: bigint };
      if (args.from && getAddress(args.from) !== zeroAddress) continue;
      if (targetOwner && args.to && getAddress(args.to) !== targetOwner) continue;
      return args.tokenId?.toString() ?? null;
    } catch {
      continue;
    }
  }

  return null;
}
```

- [ ] **Step 2: Add stage state to `useMintNft`**

In `frontend/src/hooks/useMintNft.tsx`, add imports:

```ts
import { useState } from "react";
import { usePublicClient } from "wagmi";
import { getExplorerTxUrl, extractMintedTokenId, mintStageLabels, type MintStage } from "../lib/mintTransaction";
```

Add state and public client:

```ts
  const [stage, setStage] = useState<MintStage>("idle");
  const publicClient = usePublicClient();
```

- [ ] **Step 3: Update mutation lifecycle**

Inside `mutationFn`, set stages around each async boundary:

```ts
      if (!publicClient) throw new Error("Public client not available");

      setStage("uploading_metadata");
      const { data } = await api.post<MintResp>("/nfts/metadata", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setStage("opening_wallet");
      const txHash = await writeContractAsync({
        abi: NFT_ABI,
        address: nftAddress!,
        functionName: "mint",
        args: [data.token_uri],
        chainId: targetChainId,
      });

      setStage("submitted");
      await api.post("/transactions/", {
        hash: txHash,
        wallet_address: address,
        chain_id: targetChainId,
        method: "mint_nft",
        status: "submitted",
        payload_json: {
          asset_id: data.asset_id,
          nft_contract: nftAddress,
          token_uri: data.token_uri,
          image_url: data.image_url,
        },
      });

      setStage("confirming");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      const tokenId = receipt.status === "success"
        ? extractMintedTokenId(receipt, nftAddress!, address)
        : null;

      setStage("bookkeeping");
      await api.post("/transactions/", {
        hash: txHash,
        wallet_address: address,
        chain_id: targetChainId,
        method: "mint_nft",
        status: receipt.status === "success" ? "mined" : "failed",
        payload_json: {
          asset_id: data.asset_id,
          nft_contract: nftAddress,
          token_uri: data.token_uri,
          image_url: data.image_url,
          token_id: tokenId,
        },
      });

      await api.patch(`/nfts/assets/${data.asset_id}/minted`, {
        tx_hash: txHash,
        status: receipt.status === "success" ? "minted" : "mint_failed",
        token_id: tokenId,
        owner_wallet_address: address,
        chain_id: targetChainId,
        nft_contract: nftAddress,
      });

      if (receipt.status !== "success") {
        throw new Error("Mint transaction reverted");
      }
```

Replace the existing explorer URL construction with:

```ts
      const explorerUrl = getExplorerTxUrl(targetChainId, txHash);
```

Use `explorerUrl` in the success toast.

- [ ] **Step 4: Reset stage on success and failure**

Add mutation callbacks:

```ts
    onSuccess() {
      setStage("mined");
    },

    onError(err) {
      setStage("failed");
      console.error(err);
      toast.error("Mint failed", { description: String(err) });
    },
```

Remove the previous `onError` block to avoid duplicate callbacks.

- [ ] **Step 5: Return lifecycle state**

Add these values to the hook return:

```ts
    stage,
    stageLabel: mintStageLabels[stage],
```

- [ ] **Step 6: Show lifecycle state in `MintNftCard`**

In `frontend/src/components/NFTS/MintNftCard.tsx`, include `stageLabel`:

```ts
  const { mutateAsync, isPending, isReady, errorMsg, walletControl, error, stageLabel } = useMintNft();
```

Add this above the submit button:

```tsx
        {isPending && (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {stageLabel}
          </p>
        )}
```

- [ ] **Step 7: Run frontend verification**

Run:

```powershell
Set-Location frontend
npm run build
npm run lint
```

Expected: build PASS and lint PASS with only existing warnings.

---

## Task 5: Replace Template Contract Tests With NFT Mint Tests

**Files:**
- Delete: `test/Lock.ts`
- Create: `test/BluemaroonNFT.ts`

- [ ] **Step 1: Create the NFT contract test file**

Create `test/BluemaroonNFT.ts`:

```ts
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { ZeroAddress } from "ethers";

describe("BluemaroonNFT", function () {
  async function deployNftFixture() {
    const [owner, creator, collector] = await hre.ethers.getSigners();
    const BluemaroonNFT = await hre.ethers.getContractFactory("BluemaroonNFT");
    const nft = await BluemaroonNFT.deploy();

    return { nft, owner, creator, collector };
  }

  it("sets the expected collection name and symbol", async function () {
    const { nft } = await loadFixture(deployNftFixture);

    expect(await nft.name()).to.equal("BlueMaroonNFT");
    expect(await nft.symbol()).to.equal("BMN");
  });

  it("mints token id 1 to the caller and stores the token URI", async function () {
    const { nft, creator } = await loadFixture(deployNftFixture);
    const tokenUri = "https://example.test/media/nfts/one.json";

    expect(await nft.connect(creator).mint.staticCall(tokenUri)).to.equal(1n);

    await expect(nft.connect(creator).mint(tokenUri))
      .to.emit(nft, "Transfer")
      .withArgs(ZeroAddress, creator.address, 1n);

    expect(await nft.ownerOf(1n)).to.equal(creator.address);
    expect(await nft.tokenURI(1n)).to.equal(tokenUri);
  });

  it("increments token ids across multiple creators", async function () {
    const { nft, creator, collector } = await loadFixture(deployNftFixture);

    await nft.connect(creator).mint("ipfs://creator-token");
    await nft.connect(collector).mint("ipfs://collector-token");

    expect(await nft.ownerOf(1n)).to.equal(creator.address);
    expect(await nft.ownerOf(2n)).to.equal(collector.address);
    expect(await nft.tokenURI(2n)).to.equal("ipfs://collector-token");
  });
});
```

- [ ] **Step 2: Remove the template `Lock` test**

Delete `test/Lock.ts` after `test/BluemaroonNFT.ts` exists.

- [ ] **Step 3: Run contract verification**

Run:

```powershell
npx hardhat test
```

Expected: PASS with the `BluemaroonNFT` suite.

---

## Task 6: Focused Verification And Agent Board Update

**Files:**
- Modify: `AGENT_TODO.md`

- [ ] **Step 1: Run focused backend verification**

Run:

```powershell
.\backend\scripts\verify_quiet.ps1
```

Expected: PASS summary. If it fails, run the single failing test file with `-q` and fix only the failing scope.

- [ ] **Step 2: Run contract verification**

Run:

```powershell
npx hardhat test
```

Expected: PASS with no template `Lock` suite.

- [ ] **Step 3: Run frontend verification**

Run:

```powershell
Set-Location frontend
npm run build
npm run lint
```

Expected: build PASS and lint PASS. Existing warnings are acceptable if they match the known Fast Refresh warnings and build chunk warnings.

- [ ] **Step 4: Browser smoke check when local server is available**

Run the frontend/backend locally only if the sandbox/browser environment allows it:

```powershell
Set-Location frontend
npm run dev
```

Then use the in-app Browser to inspect `/web3-commerce` and confirm:

- Mint card is visible in the Web3 dashboard.
- Mint button is disabled when no valid file is selected.
- File error copy appears for unsupported file types.
- Wallet readiness message still appears before a linked wallet is ready.
- No obvious text overlap occurs on desktop width.

If the browser transport or Vite sandbox issue recurs, record that limitation in the final handoff instead of burning tokens on repeated retries.

- [ ] **Step 5: Update `AGENT_TODO.md`**

Move these items under Workstream 4 from `Next` to `Completed` if verified:

- Serve uploaded media intentionally from FastAPI.
- Add backend tests for metadata upload, app asset creation, and minted-state patching.
- Add frontend validation for file type, file size, missing wallet, wrong chain, and failed contract write.
- Confirm transaction-state transitions for pending, submitted, mined, failed, and retried mint flows.
- Add contract tests for `BluemaroonNFT.mint`.

If transaction retry is only represented as “user can submit again after failure” rather than a dedicated retry button, leave a new follow-up:

```markdown
- [ ] Add explicit one-click retry for failed mint bookkeeping or reverted mint transactions.
```

---

## Self-Review

- **Spec coverage:** Covers media serving, backend route tests, frontend validation, transaction lifecycle states, and real NFT contract tests.
- **Scope control:** Does not migrate to Supabase Storage or IPFS in this slice. That remains a later production-storage plan.
- **Token control:** Uses three narrow implementation tasks plus orchestrator verification. Avoids broad subagents, broad frontend testing setup, and noisy successful test output.
- **Known limitation:** Full browser smoke may still be blocked by the prior Browser MCP transport or Vite sandbox issue. Do the local check when available, but do not loop on it.

---

## Execution Options

Plan complete and saved to `docs/superpowers/plans/2026-06-07-creator-mint-flow-hardening.md`.

**1. Subagent-Driven, recommended:** Dispatch focused agents for backend, frontend, and contract tasks, with orchestrator review between tasks.

**2. Inline Execution:** Execute tasks in this session with checkpoints after backend, frontend, and contract verification.
