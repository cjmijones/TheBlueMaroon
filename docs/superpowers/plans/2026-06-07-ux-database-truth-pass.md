# UX Database Truth Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace misleading mock UX with portfolio-backed data or explicit unavailable states.

**Architecture:** Keep live state sourced from `/api/portfolio/me` via `usePortfolio`. Hooks for unavailable marketplace capabilities should return empty data and status metadata instead of mock records. UI components should state the capability boundary without exposing fake numbers or fake actions.

**Tech Stack:** React 19, Vite, TypeScript, TanStack Query, Tailwind utility classes, existing app UI components.

---

## File Structure
- Modify: `frontend/src/hooks/usePositions.tsx` to derive fractionalized creator assets from live portfolio data.
- Modify: `frontend/src/hooks/usePosition.tsx` to find a launched creator asset from portfolio data by id.
- Modify: `frontend/src/hooks/useWithdrawable.tsx`, `frontend/src/hooks/useSellQuote.tsx`, `frontend/src/hooks/useOrderBook.tsx`, and `frontend/src/hooks/useOpenOrders.tsx` to return unavailable/empty live-state placeholders instead of mock values.
- Modify: `frontend/src/pages/HoldingDetail/index.tsx` to show launched asset facts and unavailable trading panels.
- Modify: `frontend/src/components/Portfolio/HoldingsTable.tsx` and `frontend/src/components/Portfolio/NAVWidget.tsx` to stop calculating fake trading metrics.
- Modify: `frontend/src/components/SellModal/index.tsx`, `frontend/src/components/WithdrawModal/index.tsx`, `frontend/src/components/OrderMarket/MarketDepthCard.tsx`, `frontend/src/components/OrderMarket/OpenOrdersTable.tsx`, and `frontend/src/components/CheckoutModal/index.tsx` to make unsupported flows explicit.
- Modify: `frontend/src/hooks/useListings.tsx`, `frontend/src/hooks/useRecentListings.tsx`, `frontend/src/hooks/useAsset.tsx`, `frontend/src/pages/Explore/index.tsx`, and `frontend/src/pages/AssetDetail/index.tsx` to quarantine mock marketplace data.
- Modify: `AGENT_TODO.md` to record completed truth-pass items and remaining live marketplace work.

## Tasks

### Task 1: Remove Fake Position Numbers
- [ ] Update `usePositions` so it maps `CreatedAsset` records with `lifecycle === "fractionalized_asset"` into position rows with nullable price and value fields.
- [ ] Update `usePosition` so it reads the same live portfolio query and returns `null` for unknown ids.
- [ ] Update holding UI to show asset identity, vault, NFT contract, token id, share supply, status, and transaction hash.
- [ ] Keep price, NAV, sell, and withdraw areas unavailable unless a real endpoint provides data.

### Task 2: Remove Fake Trading Data
- [ ] Change withdrawable, sell quote, order book, and open-order hooks so they return empty data plus `isAvailable: false`.
- [ ] Update modals and order widgets to use concise unavailable states.
- [ ] Preserve disabled controls only where they clarify that the feature exists but is not connected to live settlement yet.

### Task 3: Quarantine Marketplace Mocks
- [ ] Change listing hooks to return empty lists and a clear unavailable reason.
- [ ] Change Explore to show an empty marketplace state instead of listing mock artworks.
- [ ] Change Asset Detail to show an unavailable state when no live asset can be loaded.
- [ ] Change Checkout copy so it does not imply live purchase support.

### Task 4: Verify And Record
- [ ] Run frontend build and lint.
- [ ] Run backend quiet verification if backend files changed.
- [ ] Update `AGENT_TODO.md`.
- [ ] Do not run git commands in this pass.
