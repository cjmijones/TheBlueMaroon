# KYC Wallet Creator Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require clear KYC for minting and fractionalization, and show users the exact wallet/KYC readiness state that controls those actions.

**Architecture:** Add a shared backend creator-action guard that combines durable role, KYC, and linked-wallet checks, then reuse it in NFT and fractional routes. Add a compact frontend readiness component fed by `/api/me` and wallet-control state, with a KYC start hook for Didit.

**Tech Stack:** FastAPI, async SQLAlchemy, pytest, React 19, Vite, TypeScript, React Query, wagmi/RainbowKit, Supabase Auth.

---

### Task 1: Backend Creator-Action Guard

**Files:**
- Create: `backend/app/auth/creator_actions.py`
- Modify: `backend/tests/test_creator_action_guard.py`

- [ ] **Step 1: Write failing guard tests**

Create `backend/tests/test_creator_action_guard.py` with tests for:

```python
import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.auth import creator_actions


class FakeResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class FakeDb:
    def __init__(self, wallet=None, user=None):
        self.results = [FakeResult(wallet), FakeResult(user)]

    async def execute(self, statement):
        return self.results.pop(0)


def wallet(address="0xabc"):
    return SimpleNamespace(address=address, user_id="user-1")


def user(roles=("creator",), aml_status="clear", id_verified_at="2026-06-07"):
    return SimpleNamespace(
        id="user-1",
        roles=[SimpleNamespace(slug=slug) for slug in roles],
        verification=SimpleNamespace(
            aml_status=aml_status,
            id_verified_at=id_verified_at,
        ),
    )


def test_creator_action_guard_allows_creator_with_clear_kyc_and_linked_wallet():
    result = asyncio.run(
        creator_actions.require_creator_action_ready(
            FakeDb(wallet=wallet("0xabc"), user=user()),
            "user-1",
            "0xABC",
        )
    )

    assert result.address == "0xabc"


def test_creator_action_guard_rejects_missing_wallet():
    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            creator_actions.require_creator_action_ready(
                FakeDb(wallet=None, user=user()),
                "user-1",
                "0xABC",
            )
        )

    assert exc.value.status_code == 403
    assert "wallet" in str(exc.value.detail).lower()


def test_creator_action_guard_rejects_missing_creator_role():
    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            creator_actions.require_creator_action_ready(
                FakeDb(wallet=wallet(), user=user(roles=("member",))),
                "user-1",
                "0xABC",
            )
        )

    assert exc.value.status_code == 403
    assert "creator" in str(exc.value.detail).lower()


def test_creator_action_guard_rejects_missing_clear_kyc():
    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            creator_actions.require_creator_action_ready(
                FakeDb(wallet=wallet(), user=user(aml_status="pending", id_verified_at=None)),
                "user-1",
                "0xABC",
            )
        )

    assert exc.value.status_code == 403
    assert "kyc" in str(exc.value.detail).lower()
```

- [ ] **Step 2: Run failing guard tests**

Run: `.\backend\venv\Scripts\python -m pytest backend\tests\test_creator_action_guard.py -q --tb=short`

Expected: fail because `app.auth.creator_actions` does not exist.

- [ ] **Step 3: Implement guard**

Create `backend/app/auth/creator_actions.py`:

```python
from typing import Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import User, Wallet


def kyc_is_clear(user: Any) -> bool:
    verification = getattr(user, "verification", None)
    return bool(
        verification
        and getattr(verification, "aml_status", None) == "clear"
        and getattr(verification, "id_verified_at", None)
    )


def has_role(user: Any, slug: str) -> bool:
    return any(getattr(role, "slug", None) == slug for role in getattr(user, "roles", []) or [])


async def require_creator_action_ready(
    db: AsyncSession,
    user_id: str,
    wallet_address: str | None,
) -> Wallet:
    if not wallet_address:
        raise HTTPException(status_code=403, detail="Linked wallet is required")

    wallet_result = await db.execute(
        select(Wallet).where(
            Wallet.user_id == user_id,
            Wallet.address == wallet_address.lower(),
        )
    )
    wallet = wallet_result.scalar_one_or_none()
    if not wallet:
        raise HTTPException(status_code=403, detail="Wallet is not linked to this account")

    user_result = await db.execute(
        select(User)
        .options(selectinload(User.roles), selectinload(User.verification))
        .where(User.id == user_id)
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Authenticated user was not found")
    if not has_role(user, "creator"):
        raise HTTPException(status_code=403, detail="Creator role is required")
    if not kyc_is_clear(user):
        raise HTTPException(status_code=403, detail="KYC verification is required")
    return wallet
```

- [ ] **Step 4: Run guard tests**

Run: `.\backend\venv\Scripts\python -m pytest backend\tests\test_creator_action_guard.py -q --tb=short`

Expected: pass.

### Task 2: Apply Guard To NFT And Fractional Routes

**Files:**
- Modify: `backend/app/api/routes_nfts.py`
- Modify: `backend/app/api/routes_fractional.py`
- Modify: `backend/tests/test_nft_routes.py`
- Modify: `backend/tests/test_fractional_routes.py`

- [ ] **Step 1: Write failing route tests**

Add NFT and fractional tests that monkeypatch `require_creator_action_ready` and verify route calls it. Add rejection tests that raise `HTTPException(403, "KYC verification is required")`.

- [ ] **Step 2: Run focused route tests**

Run: `.\backend\venv\Scripts\python -m pytest backend\tests\test_nft_routes.py backend\tests\test_fractional_routes.py -q --tb=short`

Expected: fail until routes call the new guard.

- [ ] **Step 3: Replace route-level linked-wallet calls**

In `routes_nfts.py`, import `require_creator_action_ready` and call it in `upload_metadata`. In `mark_asset_minted`, call it when `payload.owner_wallet_address` is present before changing owner data.

In `routes_fractional.py`, import `require_creator_action_ready` and call it before draft creation and before finalization.

- [ ] **Step 4: Run focused route tests**

Run: `.\backend\venv\Scripts\python -m pytest backend\tests\test_nft_routes.py backend\tests\test_fractional_routes.py -q --tb=short`

Expected: pass.

### Task 3: KYC Route And Webhook Hardening

**Files:**
- Modify: `backend/app/api/routes_kyc.py`
- Modify: `backend/tests/test_kyc_state.py`

- [ ] **Step 1: Write failing KYC tests**

Add tests for:

- `start_kyc` creates a `UserVerification` row if missing and returns the hosted URL.
- `start_kyc` leaves an existing row in place.
- `verify_didit_signature` accepts a valid `X-Signature-V2` with a fresh timestamp.
- `verify_didit_signature` rejects stale timestamps and bad signatures.

- [ ] **Step 2: Run failing KYC tests**

Run: `.\backend\venv\Scripts\python -m pytest backend\tests\test_kyc_state.py -q --tb=short`

Expected: fail until helpers exist.

- [ ] **Step 3: Implement signature helper and route use**

In `routes_kyc.py`, add helpers that verify `X-Signature-V2` from parsed JSON canonical form with `X-Timestamp`, using a 5-minute replay window. Preserve `X-Didit-Signature` raw-body HMAC as a legacy fallback.

- [ ] **Step 4: Run KYC tests**

Run: `.\backend\venv\Scripts\python -m pytest backend\tests\test_kyc_state.py -q --tb=short`

Expected: pass.

### Task 4: Wallet Route Coverage

**Files:**
- Modify: `backend/tests/test_wallet_routes.py`
- Modify if needed: `backend/app/api/routes_wallets.py`
- Modify if needed: `backend/app/crud/wallet.py`

- [ ] **Step 1: Add tests**

Add focused tests for:

- `_take_nonce` deletes and returns a nonce.
- `_take_nonce` rejects missing nonce.
- `_parse_allowed_chains` accepts JSON and loose comma formats.
- `add_wallet` marks only the first wallet as primary.
- `add_wallet` rejects wallets linked to another user.

- [ ] **Step 2: Run wallet tests**

Run: `.\backend\venv\Scripts\python -m pytest backend\tests\test_wallet_routes.py -q --tb=short`

Expected: pass or expose a real behavior gap.

### Task 5: Frontend Creator Readiness UX

**Files:**
- Create: `frontend/src/hooks/useKyc.tsx`
- Create: `frontend/src/hooks/useCreatorReadiness.tsx`
- Create: `frontend/src/components/web3Dash/CreatorReadinessPanel.tsx`
- Modify: `frontend/src/pages/Dashboard/Web3Commerce.tsx`
- Modify: `frontend/src/hooks/useMintNft.tsx`
- Modify: `frontend/src/hooks/useFractionalize.tsx`

- [ ] **Step 1: Add KYC start hook**

Create `useKyc.tsx` with a React Query mutation that posts to `/kyc/start` and opens the returned URL.

- [ ] **Step 2: Add creator readiness hook**

Create `useCreatorReadiness.tsx` that combines `useUserProfile()` and `useWalletControlState()` into a single status message and `canUseCreatorActions`.

- [ ] **Step 3: Add Web3 panel**

Create `CreatorReadinessPanel.tsx` showing role, KYC, wallet, and action readiness. Include a Start KYC button when KYC is not clear.

- [ ] **Step 4: Gate hooks before wallet dialogs**

Update mint and fractionalization hooks to block when `/api/me` capabilities report missing KYC or creator role, while preserving current wallet-control errors.

- [ ] **Step 5: Verify frontend**

Run: `cd frontend; npm run build`

Expected: build passes.

### Task 6: Final Verification And Todo Update

**Files:**
- Modify: `AGENT_TODO.md`

- [ ] **Step 1: Run backend quiet verification**

Run: `.\backend\scripts\verify_quiet.ps1`

Expected: backend pytest pass.

- [ ] **Step 2: Run frontend build**

Run: `cd frontend; npm run build`

Expected: build pass.

- [ ] **Step 3: Update local task board**

Mark completed KYC/wallet tasks and add any follow-up gaps discovered during implementation.

