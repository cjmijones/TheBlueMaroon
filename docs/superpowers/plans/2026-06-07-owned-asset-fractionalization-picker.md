# Owned Asset Fractionalization Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an owned minted asset picker to the fractionalization card while preserving manual contract/token entry as an advanced fallback.

**Architecture:** Use `/api/portfolio/me` as the asset source. Add `owner_wallet_address` to created asset payloads, filter eligible minted assets on the frontend, and submit the selected asset’s contract/token ID into the existing `useFractionalize` mutation.

**Tech Stack:** FastAPI, React 19, TypeScript, wagmi, TanStack Query.

**Workspace Preference:** Do not run or include git commands. Keep this as a small inline implementation unless it grows unexpectedly.

---

## Task 1: Portfolio Asset Ownership Field

**Files:**
- Modify: `backend/app/api/routes_portfolio.py`
- Modify: `frontend/src/hooks/usePortfolio.tsx`

- [ ] Add `owner_wallet_address` to app-created asset payloads in `routes_portfolio.py`.
- [ ] Add `owner_wallet_address?: string | null` to `CreatedAsset`.

## Task 2: Eligible Asset Filtering

**Files:**
- Create: `frontend/src/components/NFTS/fractionalizeAssetSelection.ts`

- [ ] Add helper functions for linked-wallet matching, asset identity keys, and eligible minted asset filtering.
- [ ] Exclude assets with matching draft or active fractional listings.

## Task 3: Fractionalize Card Picker UI

**Files:**
- Modify: `frontend/src/components/NFTS/FractionalizeCard.tsx`

- [ ] Fetch portfolio data with the connected wallet and chain.
- [ ] Default to selectable eligible minted assets.
- [ ] Add advanced/manual toggle.
- [ ] Submit selected asset contract/token ID when not in manual mode.
- [ ] Keep lifecycle/error states from `useFractionalize`.

## Task 4: Verification And Todo

**Files:**
- Modify: `AGENT_TODO.md`

- [ ] Run backend quiet tests.
- [ ] Run frontend build.
- [ ] Run frontend eslint through the local binary if npm lint is blocked.
- [ ] Mark owned-asset picker complete in `AGENT_TODO.md`.

