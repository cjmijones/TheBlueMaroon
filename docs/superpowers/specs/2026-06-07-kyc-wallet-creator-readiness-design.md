# KYC Wallet Creator Readiness Design

## Goal

Make creator blockchain actions line up across backend policy and frontend UX. Minting and fractionalization should both require an authenticated creator with a linked wallet and clear KYC status.

## Current State

The app already has Supabase-authenticated local users, durable role slugs, linked wallets, a KYC verification row, and `/api/me` capability flags. Wallet linking has nonce-based SIWE verification and the Web3 Dashboard owns the main wallet-control workflow.

Two gaps remain:

- `/api/me` says some actions require KYC, but backend creator action routes currently enforce linked wallets more strongly than KYC/creator state.
- The frontend does not clearly present KYC status as part of wallet/action readiness.

## Policy

Minting and fractionalization require all of these:

- signed-in Supabase user;
- durable `creator` role;
- clear KYC status, meaning `user_verification.aml_status == "clear"` and `id_verified_at` is present;
- submitted creator/owner wallet address linked to the same local user account;
- supported chain and configured contract path, where route-specific logic already applies it.

Wallet-connected and KYC-verified remain derived capability states, not durable roles.

## Backend Design

Add a shared creator-action guard under `backend/app/auth/` so NFT and fractional routes enforce the same rule. The guard should load the full local user with roles and verification, check the submitted wallet address against the `wallets` table, then reject with clear 403 messages for missing wallet, missing creator role, or missing KYC.

Apply the guard to:

- `POST /api/nfts/metadata`;
- `PATCH /api/nfts/assets/{asset_id}/minted` when an owner wallet is submitted;
- `POST /api/fractional/`;
- `PATCH /api/fractional/{vault}` to ensure the finalizing creator still meets KYC requirements.

KYC webhook handling should continue to use the raw request body before parsing JSON. Add support for Didit's current recommended `X-Signature-V2` plus `X-Timestamp` validation while preserving the current local `X-Didit-Signature` path as a legacy fallback for existing configuration.

## Frontend Design

Add a small creator readiness surface to the Web3 Dashboard, using `/api/me` plus wallet control state. It should show:

- wallet readiness;
- creator role status;
- KYC status;
- whether minting/fractionalization are currently available;
- one action to start KYC when not clear.

Mint and fractionalization hooks should use the combined profile capability state to block action with a clear message before opening wallet dialogs.

Profile can display account identity and KYC state, but wallet operations remain in the Web3 Dashboard.

## Testing

Backend tests should cover:

- creator-action guard accepts only linked-wallet creator users with clear KYC;
- mint metadata upload rejects missing KYC;
- fractional draft creation rejects missing KYC;
- KYC start creates or reuses the verification row and returns a hosted URL;
- KYC webhook rejects bad signatures and accepts valid V2 signatures;
- wallet nonce/link/unlink helpers keep nonce, single-use, conflict, and primary-wallet behavior covered.

Frontend verification should use the existing build/lint checks, plus route smoke only if UI rendering changes need browser confirmation.

