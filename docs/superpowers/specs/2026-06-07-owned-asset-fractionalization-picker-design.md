# Owned Asset Fractionalization Picker Design

## Goal

Make fractionalization feel like a creator workflow by letting users select one of their own minted creator assets instead of manually typing NFT contract and token ID by default.

## Scope

This is a frontend-first UX slice with one backend payload addition. It keeps the manual NFT contract/token ID path as an advanced fallback and does not define trading, withdrawal, or share-market behavior.

## Data Flow

The existing `/api/portfolio/me` response already returns `created_assets` and fractional listing rows. Add `owner_wallet_address` to app-created assets so the frontend can prove that eligible minted assets belong to one of the user’s linked wallets.

The picker should list only assets that:

- have `status === "minted"`;
- have `nft_contract`, `token_id`, `chain_id`, and `owner_wallet_address`;
- are owned by one of the account’s linked wallets;
- do not already have a matching draft or active fractional listing in `created_assets`.

## UI Behavior

`FractionalizeCard` should default to a selectable list of eligible minted assets. Selecting an asset pre-fills the NFT contract and token ID used for `useFractionalize`.

If there are no eligible minted assets, show a clear empty state. Manual entry remains available through an advanced/manual toggle for testing or edge cases.

## Verification

Run frontend build and lint, plus backend quiet tests because the portfolio API shape changes. Browser smoke remains best-effort due the known local process launch issue.

