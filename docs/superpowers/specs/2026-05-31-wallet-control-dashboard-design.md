# Wallet Control And Web3 Dashboard Cleanup Design

Date: 2026-05-31

## Goal

Tighten the authenticated wallet experience by making the Web3 Dashboard the single place for wallet setup and non-marketplace blockchain actions. Portfolio should become a read-mostly asset and metrics surface. Profile should become account identity only.

The key product rule is:

> A connected wallet is only a browser connection. A linked wallet is an app identity permission.

Minting, fractionalization, and later non-marketplace blockchain actions must require the current wallet to be both connected in the browser and linked to the signed-in Supabase user account.

## Current Problems

Wallet functionality is split across three surfaces:

- Profile includes `WalletCard`, which lets users connect, link, list, and unlink wallets.
- Portfolio includes a "Wallet Control" panel with connect/link actions, balances, and wallet status labels.
- Web3 Dashboard contains balances, minting, fractionalization, assets, and identity placeholders, but does not own the wallet control workflow.

The current status language is also ambiguous. States like "Connected Not linked" are technically accurate but do not tell the user what to do next.

There is a concrete SIWE failure in the wallet-link flow. The backend nonce uses `token_urlsafe(16)`, which can generate `-` or `_`. The frontend `siwe` v3 parser rejects those characters because SIWE nonces must be alphanumeric. This can produce errors such as:

```text
invalid message: max line number was 9
```

## Proposed Product Boundaries

### Profile

Profile should show account-level identity and verification data only:

- Supabase user identity
- Basic user details
- Email and profile metadata
- KYC or verification status when available

Profile should not manage wallet connection, linking, unlinking, balances, or chain state.

### Portfolio

Portfolio should be read-mostly:

- Linked wallet summaries
- Balances and asset views
- Owned NFTs
- Creator asset lifecycle
- Fractional positions
- Metrics later

Portfolio may show wallet status and balances, but wallet actions should route to `/web3-commerce`. The call to action should make the relationship clear, for example "Manage wallets in Web3 Dashboard."

### Web3 Dashboard

Web3 Dashboard should own active blockchain workflows:

- Connect browser wallet
- Link connected wallet to the Supabase user account
- Show linked wallets and current wallet status
- Explain wrong-chain, unlinked-wallet, and wallet-switch states
- Refresh balances
- Mint NFTs
- Fractionalize NFTs
- Later: fiat/coin purchase or exchange flows outside marketplace browsing

## Wallet State Model

Add a small shared frontend wallet-control abstraction, likely a hook named `useWalletControlState`.

It should derive a display state from wagmi, linked-wallet API data, chain config, and current route context:

- `not_connected`: user is logged in, but no browser wallet is connected.
- `connected_not_linked`: browser wallet is connected, but that address is not linked to the app account.
- `linked_ready`: current browser wallet is linked to this user and on a supported chain.
- `wrong_chain`: wallet is connected or linked, but the chain is unsupported or not configured for the intended action.
- `connected_different_wallet`: the account has linked wallets, but the currently connected browser wallet is not among them.
- `linking`: link workflow is in progress.
- `link_failed`: link workflow failed and has a mapped recovery message.

This state should expose:

- Current browser address and chain.
- Matching linked wallet, if one exists.
- Whether creator actions are allowed.
- Primary user-facing title and message.
- Recovery action labels where applicable.

## Wallet Control Panel

Add a `WalletControlPanel` component to Web3 Dashboard.

It should provide:

- Browser wallet connect action when no wallet is connected.
- Link-to-account action when a wallet is connected but unlinked.
- Linked-ready confirmation when the connected wallet matches a linked wallet.
- A list of linked wallets with address, ENS name if available, chain, primary flag, and unlink action.
- Clear state copy for common recovery paths:
  - "Connect MetaMask or another wallet to continue."
  - "This wallet is connected in your browser, but not linked to your Blue Maroon account."
  - "Switch to a linked wallet or link this wallet."
  - "Switch to Sepolia or Mainnet."
  - "The signature request was rejected. Try linking again when ready."
  - "The link request expired. Try again."

The panel should avoid showing raw internal state labels as the main user message.

## Portfolio Changes

Remove direct link/connect functionality from Portfolio. Replace the current "Wallet Control" panel with a wallet summary that:

- Shows linked wallet count and balances.
- Shows whether the currently connected wallet is linked.
- Links to `/web3-commerce` for connection, linking, switching, unlinking, and refresh controls.

Portfolio can keep balance and asset summaries because those are useful at this level of the app.

## Profile Changes

Remove `WalletCard` from Profile.

The existing `WalletCard` can either be retired or refactored into the Web3 Dashboard wallet panel. The preferred approach is to create a dashboard-specific panel and delete or stop exporting the profile wallet card once no code references it.

## SIWE And Link Flow Fixes

Backend:

- Replace `token_urlsafe(16)` for SIWE nonces with an alphanumeric generator.
- Keep nonce TTL and single-use Redis behavior.
- Preserve current allowed-chain checks.
- Keep logs redacted.
- Consider returning stable error codes for common wallet-link failures so frontend mapping does not depend on string matching.

Frontend:

- Normalize the connected address to EIP-55 checksum format before constructing `SiweMessage`.
- Guard SIWE message creation errors and show a user-facing error instead of only logging to console.
- Map link failures to clear recovery messages:
  - Wallet signature rejected.
  - Nonce expired or already used.
  - Unsupported chain.
  - Wallet belongs to another user.
  - Backend unavailable.

## Creator Action Gates

Minting and fractionalization controls should be disabled unless `linked_ready` is true.

When disabled, each card should display the wallet control state message and a route/action toward fixing it. The user should not be allowed to submit the form with only a connected-but-unlinked wallet.

Backend routes for creator workflows should continue to derive the app user from the Supabase access token. Follow-up hardening can reject creator actions when the supplied wallet address is not linked to that user.

## Non-Goals

This design does not implement marketplace order flows, fiat onramp, trading, or final portfolio metrics.

This design does not require Supabase Pro session controls.

This design does not require a new global header wallet widget. The current scope keeps wallet actions centralized in Web3 Dashboard.

## Implementation Notes

Likely frontend files:

- `frontend/src/components/UserProfiles.tsx`
- `frontend/src/pages/PortfolioDashboard/index.tsx`
- `frontend/src/pages/Dashboard/Web3Commerce.tsx`
- `frontend/src/components/wallet/LinkWalletButton.tsx`
- `frontend/src/components/web3Dash/*`
- `frontend/src/hooks/useWalletAPI.tsx`
- New wallet-control hook/component under `frontend/src/hooks/` and `frontend/src/components/wallet/` or `frontend/src/components/web3Dash/`

Likely backend files:

- `backend/app/api/routes_wallets.py`
- `backend/tests/test_wallet_routes.py`

## Testing And Verification

Focused checks should include:

- Backend unit tests for alphanumeric nonce generation.
- Backend tests for nonce reuse and expired nonce behavior where practical.
- Frontend build check.
- Manual browser verification for:
  - No connected wallet.
  - Connected but unlinked wallet.
  - Linked wallet.
  - Wrong chain or unsupported chain.
  - Portfolio routes wallet actions to Web3 Dashboard.
  - Profile no longer shows wallet management.

Full marketplace, contract, and broad simulation tests are not required for this slice.

## Open Decisions

The current implementation can keep the existing primary-wallet behavior. A later pass should define how users choose or change a primary wallet when multiple wallets are linked.

The backend should eventually enforce linked-wallet ownership on mint and fractionalization bookkeeping, not just rely on frontend gates. That hardening can be included in this slice if it is small; otherwise it should be the next security follow-up.
