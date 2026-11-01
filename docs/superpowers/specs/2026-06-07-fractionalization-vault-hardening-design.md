# Fractionalization Vault Hardening Design

## Goal

Harden the existing manual fractionalization flow so a creator can move from an owned NFT to a deployed fractional vault with clear contract coverage, exact backend draft finalization, and visible frontend lifecycle states.

## Scope

This keeps the current manual NFT contract and token ID form. It does not add a portfolio-owned asset picker yet, and it does not define secondary trading or withdrawal mechanics. Those remain follow-up slices after the vault flow itself is trustworthy.

## Contract Design

Add real Hardhat tests for `FractionalVault` and `VaultFactory`.

The tests should prove that:

- `FractionalVault.initialize` can only run once.
- Initialization transfers NFT custody from the creator to the vault.
- Initialization mints ERC-20 shares to the creator using 18 decimals.
- `VaultFactory.predictVault` matches the actual emitted `VaultCreated` address.
- Factory-created vaults hold the NFT and mint shares correctly.
- Creating the same vault twice fails.

No contract behavior changes are intended unless the tests expose a real defect.

## Backend Design

Backend draft creation should bind each draft to the deterministic vault address calculated by the frontend. The existing `vault_salt` column will store this predicted vault address for drafts. This avoids a migration while giving finalize a stable lookup key.

Draft creation should:

- validate `predicted_vault`;
- require a linked creator wallet;
- reject an existing draft or active listing for the same creator, NFT, token, chain, and predicted vault;
- store `vault_salt = predicted_vault.lower()`;
- return the draft id and predicted vault.

Finalize should:

- finalize only the draft whose `vault_salt` matches the `{vault}` path;
- require the current user to own that draft;
- return `404` when no matching draft exists;
- return `409` when the vault has already been finalized;
- update `vault`, `tx_hash`, and `status = active`.

## Frontend Design

Keep `FractionalizeCard` as a manual form, but make the lifecycle explicit.

`useFractionalize` should expose:

- `stage`;
- `stageLabel`;
- `errorMsg`;
- wallet readiness from `useWalletControlState`;
- the existing mutation result.

The flow should report these stages:

- checking predicted vault;
- approving NFT;
- approval submitted;
- approval confirmed;
- creating draft;
- opening wallet for vault creation;
- vault transaction submitted;
- confirming vault;
- finalizing listing;
- active;
- failed.

The hook should also decode the `VaultCreated` event from the factory receipt and use the emitted vault address when possible. If no event is found, it may fall back to the predicted vault, but that fallback should be explicit in the helper.

## Testing And Verification

Use narrow subagents:

- contract worker for `test/FractionalVault.ts`;
- backend worker for `backend/app/api/routes_fractional.py`, `backend/app/schemas/fractional.py`, and `backend/tests/test_fractional_routes.py`;
- frontend worker for `frontend/src/hooks/useFractionalize.tsx`, `frontend/src/components/NFTS/FractionalizeCard.tsx`, and `frontend/src/lib/fractionalTransaction.ts`.

Final verification should run:

- backend quiet tests;
- Hardhat tests;
- frontend build;
- frontend lint via local eslint if the global npm shim is broken;
- browser smoke only if local server launch cooperates.

