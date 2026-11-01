# Fractionalization Vault Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the current manual fractionalization flow from NFT approval through deterministic vault creation, exact backend draft finalization, and visible frontend lifecycle states.

**Architecture:** Keep the existing manual NFT contract and token ID form. Use the frontend-predicted vault address as the stable draft binding and store it in the existing `fractional_listings.vault_salt` column until finalization. Add contract tests for vault/factory behavior and add frontend stages that mirror the actual chain/backend flow.

**Tech Stack:** Solidity, Hardhat, ethers v6, Chai, FastAPI, Pydantic, async SQLAlchemy/text queries, React 19, wagmi/viem, TanStack Query.

**Workspace Preference:** Do not run or include git commands. Use focused verification and update `AGENT_TODO.md` after implementation.

---

## File Structure

- Create `test/FractionalVault.ts`
  - Tests real `FractionalVault` and `VaultFactory` behavior.
- Modify `backend/app/schemas/fractional.py`
  - Adds `predicted_vault` to draft creation.
- Modify `backend/app/api/routes_fractional.py`
  - Stores predicted vault in `vault_salt`, rejects duplicates, finalizes by exact predicted vault instead of latest draft.
- Create `backend/tests/test_fractional_routes.py`
  - Adds route-level tests for draft/finalize ownership and duplicate behavior.
- Create `frontend/src/lib/fractionalTransaction.ts`
  - Adds stage labels, explorer helpers, and `VaultCreated` event extraction.
- Modify `frontend/src/hooks/useFractionalize.tsx`
  - Adds staged lifecycle, submitted/mined/failed transaction recording, event-based vault resolution, and finalization state.
- Modify `frontend/src/components/NFTS/FractionalizeCard.tsx`
  - Shows readiness, lifecycle, validation-ish error copy, and ASCII pending text.
- Modify `AGENT_TODO.md`
  - Records completed fractionalization hardening tasks and leaves future trading/withdrawal work open.

---

## Task 1: Contract Vault And Factory Tests

**Files:**
- Create: `test/FractionalVault.ts`

- [ ] **Step 1: Create the contract tests**

Create `test/FractionalVault.ts`:

```ts
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("FractionalVault and VaultFactory", function () {
  async function deployFixture() {
    const [creator, other] = await hre.ethers.getSigners();

    const BluemaroonNFT = await hre.ethers.getContractFactory("BluemaroonNFT");
    const nft = await BluemaroonNFT.deploy();

    const FractionalVault = await hre.ethers.getContractFactory("FractionalVault");
    const implementation = await FractionalVault.deploy();

    const VaultFactory = await hre.ethers.getContractFactory("VaultFactory");
    const factory = await VaultFactory.deploy(await implementation.getAddress());

    await nft.connect(creator).mint("ipfs://creator-token");
    await nft.connect(other).mint("ipfs://other-token");

    return { creator, other, nft, implementation, factory, FractionalVault };
  }

  it("initializes once, moves NFT custody, and mints shares", async function () {
    const { creator, nft, implementation } = await loadFixture(deployFixture);
    const vaultAddress = await implementation.getAddress();

    await nft.connect(creator).approve(vaultAddress, 1n);
    await implementation
      .connect(creator)
      .initialize(creator.address, await nft.getAddress(), 1n, 100n, "Blue Shares", "BMS");

    expect(await implementation.initialized()).to.equal(true);
    expect(await implementation.nft()).to.equal(await nft.getAddress());
    expect(await implementation.tokenId()).to.equal(1n);
    expect(await nft.ownerOf(1n)).to.equal(vaultAddress);
    expect(await implementation.balanceOf(creator.address)).to.equal(100n * 10n ** 18n);
    expect(await implementation.name()).to.equal("Blue Shares");
    expect(await implementation.symbol()).to.equal("BMS");

    await expect(
      implementation
        .connect(creator)
        .initialize(creator.address, await nft.getAddress(), 1n, 100n, "Again", "AGAIN"),
    ).to.be.revertedWith("already init");
  });

  it("predicts the factory vault, emits it, transfers custody, and mints shares", async function () {
    const { creator, nft, factory, FractionalVault } = await loadFixture(deployFixture);
    const nftAddress = await nft.getAddress();
    const predicted = await factory.predictVault(nftAddress, 1n, creator.address);

    await nft.connect(creator).approve(predicted, 1n);

    await expect(factory.connect(creator).createVault(nftAddress, 1n, 250n, "Vault Shares", "VSH"))
      .to.emit(factory, "VaultCreated")
      .withArgs(predicted, nftAddress, 1n, 250n, creator.address);

    const vault = FractionalVault.attach(predicted);
    expect(await nft.ownerOf(1n)).to.equal(predicted);
    expect(await vault.balanceOf(creator.address)).to.equal(250n * 10n ** 18n);
    expect(await vault.nft()).to.equal(nftAddress);
    expect(await vault.tokenId()).to.equal(1n);
  });

  it("fails when creating the same deterministic vault twice", async function () {
    const { creator, nft, factory } = await loadFixture(deployFixture);
    const nftAddress = await nft.getAddress();
    const predicted = await factory.predictVault(nftAddress, 1n, creator.address);

    await nft.connect(creator).approve(predicted, 1n);
    await factory.connect(creator).createVault(nftAddress, 1n, 100n, "Vault Shares", "VSH");

    await expect(
      factory.connect(creator).createVault(nftAddress, 1n, 100n, "Vault Shares", "VSH"),
    ).to.be.reverted;
  });
});
```

- [ ] **Step 2: Run contract tests**

Run:

```powershell
New-Item -ItemType Directory -Force -Path '.agent\hardhat-appdata', '.agent\hardhat-localappdata' | Out-Null
$env:APPDATA=(Resolve-Path '.agent\hardhat-appdata').Path
$env:LOCALAPPDATA=(Resolve-Path '.agent\hardhat-localappdata').Path
& .\node_modules\.bin\hardhat.cmd test
```

Expected: PASS with both `BluemaroonNFT` and `FractionalVault and VaultFactory` suites.

---

## Task 2: Backend Draft Binding And Finalize Guardrails

**Files:**
- Modify: `backend/app/schemas/fractional.py`
- Modify: `backend/app/api/routes_fractional.py`
- Create: `backend/tests/test_fractional_routes.py`

- [ ] **Step 1: Add backend tests**

Create `backend/tests/test_fractional_routes.py`:

```python
import asyncio

import pytest
from fastapi import HTTPException

from app.api import routes_fractional
from app.schemas.fractional import FractionalCreate, FractionalFinalize


class FakeRow:
    def __init__(self, **values):
        self.__dict__.update(values)


class FakeResult:
    def __init__(self, scalar=None, first=None):
        self._scalar = scalar
        self._first = first

    def scalar_one_or_none(self):
        return self._scalar

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


def payload(predicted_vault="0x3333333333333333333333333333333333333333"):
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

    monkeypatch.setattr(routes_fractional, "require_linked_wallet", fake_require_wallet)
    db = FakeDb(results=[FakeResult(first=None)])

    result = asyncio.run(routes_fractional.create_fractional_listing(payload(), db=db, user=FakeUser()))

    assert result["status"] == "draft_created"
    assert result["predicted_vault"] == "0x3333333333333333333333333333333333333333"
    assert db.commits == 1
    assert db.params[-1]["predicted_vault"] == "0x3333333333333333333333333333333333333333"


def test_create_fractional_listing_rejects_duplicate_draft(monkeypatch):
    async def fake_require_wallet(db, user_id, address):
        return object()

    monkeypatch.setattr(routes_fractional, "require_linked_wallet", fake_require_wallet)
    db = FakeDb(results=[FakeResult(first=FakeRow(id=9, status="draft"))])

    with pytest.raises(HTTPException) as exc:
        asyncio.run(routes_fractional.create_fractional_listing(payload(), db=db, user=FakeUser()))

    assert exc.value.status_code == 409


def test_finalize_fractional_listing_updates_exact_matching_draft():
    db = FakeDb(results=[
        FakeResult(first=None),
        FakeResult(first=FakeRow(id=12, vault=None)),
    ])

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


def test_finalize_fractional_listing_rejects_already_active_vault():
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


def test_finalize_fractional_listing_rejects_missing_matching_draft():
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
```

- [ ] **Step 2: Add `predicted_vault` to the create schema**

In `backend/app/schemas/fractional.py`, add this field to `FractionalCreate`:

```python
    predicted_vault: str = Field(
        ...,
        pattern=r"^0x[a-fA-F0-9]{40}$",
    )
```

- [ ] **Step 3: Store predicted vault and reject duplicates**

In `backend/app/api/routes_fractional.py`, update `create_fractional_listing` after the linked-wallet check:

```python
    predicted_vault = payload.predicted_vault.lower()
    duplicate_row = await db.execute(
        text(
            """
            SELECT id, status
            FROM fractional_listings
            WHERE creator_id = :creator_id
              AND chain_id = :chain
              AND lower(nft_contract) = :nft
              AND token_id = :token
              AND (
                    lower(COALESCE(vault, '')) = :predicted_vault
                 OR lower(COALESCE(vault_salt, '')) = :predicted_vault
              )
            LIMIT 1
            """
        ),
        {
            "creator_id": user.id,
            "chain": payload.chain_id,
            "nft": payload.nft_contract.lower(),
            "token": payload.token_id,
            "predicted_vault": predicted_vault,
        },
    )
    if duplicate_row.first():
        raise HTTPException(409, "Fractional listing already exists for this predicted vault")
```

Then add `vault_salt` to the insert columns and value:

```sql
vault_salt
```

and:

```sql
:predicted_vault
```

Add this parameter:

```python
            "predicted_vault": predicted_vault,
```

Return:

```python
    return {"status": "draft_created", "predicted_vault": predicted_vault}
```

- [ ] **Step 4: Finalize only the exact matching draft**

In `finalize_fractional_listing`, normalize the path value:

```python
    vault_address = vault.lower()
```

Before draft lookup, check already-active rows:

```python
    active_row = await db.execute(
        text(
            """
            SELECT id, status
            FROM fractional_listings
            WHERE creator_id = :creator
              AND lower(COALESCE(vault, '')) = :vault
              AND COALESCE(status, 'draft') <> 'draft'
            LIMIT 1
            """
        ),
        {"creator": user.id, "vault": vault_address},
    )
    if active_row.first():
        raise HTTPException(409, "Listing already finalised")
```

Replace the existing draft lookup with:

```python
    draft_row = await db.execute(
        text(
            """
            SELECT id, vault
            FROM fractional_listings
            WHERE creator_id = :creator
              AND vault IS NULL
              AND lower(COALESCE(vault_salt, '')) = :vault
              AND COALESCE(status, 'draft') = 'draft'
            ORDER BY created_at DESC
            LIMIT 1
            """
        ),
        {"creator": user.id, "vault": vault_address},
    )
```

Use `vault_address` for update and response:

```python
            "vault": vault_address,
```

and:

```python
    return {"status": "active", "vault": vault_address}
```

- [ ] **Step 5: Run focused backend tests**

Run:

```powershell
Set-Location backend
$env:PYTHONPATH='.'
..\backend\venv\Scripts\pytest.exe tests/test_fractional_routes.py -q
```

Expected: PASS.

---

## Task 3: Frontend Fractionalization Lifecycle

**Files:**
- Create: `frontend/src/lib/fractionalTransaction.ts`
- Modify: `frontend/src/hooks/useFractionalize.tsx`
- Modify: `frontend/src/components/NFTS/FractionalizeCard.tsx`

- [ ] **Step 1: Create transaction helper**

Create `frontend/src/lib/fractionalTransaction.ts`:

```ts
import type { Abi, Address, TransactionReceipt } from "viem";
import { decodeEventLog, getAddress } from "viem";

import VAULT_FACTORY_ABI from "../abi/VaultFactory.json";

export type FractionalizeStage =
  | "idle"
  | "checking_vault"
  | "approving_nft"
  | "approval_submitted"
  | "approval_confirmed"
  | "creating_draft"
  | "opening_wallet"
  | "vault_submitted"
  | "confirming_vault"
  | "finalizing_listing"
  | "active"
  | "failed";

export const fractionalizeStageLabels: Record<FractionalizeStage, string> = {
  idle: "Ready to create vault",
  checking_vault: "Checking predicted vault...",
  approving_nft: "Opening wallet for NFT approval...",
  approval_submitted: "NFT approval submitted...",
  approval_confirmed: "NFT approval confirmed",
  creating_draft: "Creating draft listing...",
  opening_wallet: "Opening wallet for vault creation...",
  vault_submitted: "Vault transaction submitted...",
  confirming_vault: "Waiting for vault confirmation...",
  finalizing_listing: "Finalizing listing...",
  active: "Vault active",
  failed: "Vault creation failed",
};

const vaultFactoryAbi = VAULT_FACTORY_ABI as Abi;

export function getExplorerTxUrl(chainId: number, txHash: string): string {
  const baseUrl = chainId === 11155111 ? "https://sepolia.etherscan.io/tx/" : "https://etherscan.io/tx/";
  return `${baseUrl}${txHash}`;
}

export function getExplorerAddressUrl(chainId: number, address: string): string {
  const baseUrl = chainId === 11155111 ? "https://sepolia.etherscan.io/address/" : "https://etherscan.io/address/";
  return `${baseUrl}${address}`;
}

export function extractVaultCreatedAddress(
  receipt: TransactionReceipt,
  factoryAddress: Address,
  predictedVault: Address,
): Address {
  const normalizedFactory = getAddress(factoryAddress);

  for (const log of receipt.logs) {
    if (getAddress(log.address) !== normalizedFactory) continue;

    try {
      const decoded = decodeEventLog({
        abi: vaultFactoryAbi,
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName !== "VaultCreated") continue;
      const args = decoded.args as unknown as { vault: Address };
      if (args.vault) return getAddress(args.vault) as Address;
    } catch {
      continue;
    }
  }

  return getAddress(predictedVault) as Address;
}
```

- [ ] **Step 2: Add stages and event extraction to `useFractionalize`**

In `frontend/src/hooks/useFractionalize.tsx`, import `useState`, helper functions, and `normalizeMintError`:

```ts
import { useState } from "react";
import {
  extractVaultCreatedAddress,
  fractionalizeStageLabels,
  getExplorerAddressUrl,
  getExplorerTxUrl,
  type FractionalizeStage,
} from "../lib/fractionalTransaction";
import { normalizeMintError } from "../components/NFTS/mintValidation";
```

Add state:

```ts
  const [stage, setStage] = useState<FractionalizeStage>("idle");
  const stageLabel = fractionalizeStageLabels[stage];
```

Set stages through the mutation:

```ts
      setStage("checking_vault");
```

before `predictVault`, then:

```ts
      setStage("approving_nft");
```

before `writeContractAsync` approval, then:

```ts
      setStage("approval_submitted");
```

after approval hash, and:

```ts
      setStage("approval_confirmed");
```

after approval receipt success. Before draft POST:

```ts
      setStage("creating_draft");
```

Before `createVault` write:

```ts
      setStage("opening_wallet");
```

After vault hash:

```ts
      setStage("vault_submitted");
```

Before waiting:

```ts
      setStage("confirming_vault");
```

After receipt success:

```ts
      const emittedVault = extractVaultCreatedAddress(receipt, cfg.factory, predicted);
      setStage("finalizing_listing");
```

Use `emittedVault` for `api.patch`, transaction payload, success links, and the return value.

- [ ] **Step 3: Send `predicted_vault` and record submitted/failed states**

Ensure draft creation sends:

```ts
        predicted_vault: predicted,
```

Record approval as submitted before waiting and mined after success. Record vault creation as submitted before waiting and mined/failed after receipt. Use the existing `recordAppTransaction` helper.

If approval receipt or vault receipt is not `success`, record a failed transaction and throw an error.

- [ ] **Step 4: Return lifecycle state**

Return these values from the hook:

```ts
    stage,
    stageLabel,
    errorMsg: mutation.error ? normalizeMintError(mutation.error) : null,
```

Also add:

```ts
    onError() {
      setStage("failed");
    },
    onSuccess() {
      setStage("active");
    },
```

to the mutation callbacks.

- [ ] **Step 5: Show lifecycle state in `FractionalizeCard`**

In `frontend/src/components/NFTS/FractionalizeCard.tsx`, destructure:

```ts
  const { mutateAsync, isPending, errorMsg, isReady, stageLabel, walletControl } = useFractionalize();
```

Replace `{error.message}` with `{errorMsg}` and show the current stage above the button when pending:

```tsx
        {isPending && (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {stageLabel}
          </p>
        )}
```

Replace the button text with ASCII:

```tsx
          {isPending ? stageLabel : "Create Vault"}
```

- [ ] **Step 6: Run frontend verification**

Run:

```powershell
Set-Location frontend
npm run build
```

Then run lint. If `npm run lint` fails because the global npm shim cannot find `npm-cli.js`, run:

```powershell
.\node_modules\.bin\eslint.cmd .
```

Expected: build PASS and lint PASS with only existing Fast Refresh warnings.

---

## Task 4: Final Verification And Agent Board

**Files:**
- Modify: `AGENT_TODO.md`

- [ ] **Step 1: Run backend quiet verification**

Run:

```powershell
.\backend\scripts\verify_quiet.ps1
```

Expected: PASS.

- [ ] **Step 2: Run contract verification**

Run:

```powershell
New-Item -ItemType Directory -Force -Path '.agent\hardhat-appdata', '.agent\hardhat-localappdata' | Out-Null
$env:APPDATA=(Resolve-Path '.agent\hardhat-appdata').Path
$env:LOCALAPPDATA=(Resolve-Path '.agent\hardhat-localappdata').Path
& .\node_modules\.bin\hardhat.cmd test
```

Expected: PASS.

- [ ] **Step 3: Run frontend verification**

Run:

```powershell
Set-Location frontend
npm run build
.\node_modules\.bin\eslint.cmd .
```

Expected: PASS, with existing warnings acceptable if unchanged.

- [ ] **Step 4: Update `AGENT_TODO.md`**

Move these Workstream 5 items to completed if verified:

- Add contract tests for vault initialization, share minting, NFT custody transfer, and factory clone creation.
- Add backend tests for fractional draft ownership, finalize authorization, duplicate vault handling, and failure states.
- Review predicted-vault logic against actual emitted contract events.
- Add UI status for approve pending, approve failed, vault creation pending, finalization failed, and retry.

Leave this open:

```markdown
- [ ] Define how fractional shares become tradable or withdrawable in the app model.
```

Add this follow-up if asset-picker UX is still manual:

```markdown
- [ ] Replace manual NFT contract/token ID entry with selection from owned minted creator assets.
```

---

## Self-Review

- **Spec coverage:** Covers contract tests, backend exact-draft binding, frontend lifecycle states, emitted vault event handling, and todo-board updates.
- **Scope control:** Does not change contracts, add a migration, build trading, or add an owned-asset picker.
- **No git commands:** This plan intentionally omits git commands per repo preference.
- **Known local limitation:** Browser smoke may remain blocked by the local Windows process-launch issue; record that limitation instead of looping.

