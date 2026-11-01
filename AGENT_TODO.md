# TheBlueMaroon Agent Todo

This is the local, gitignored planning board for agents working in this repo. Use it with `AGENTS.md`, `USER_README.md`, and the current source tree. Before starting new work, scan this file, verify the relevant code paths, and update the checklist when tasks move.

Last refreshed: 2026-06-07

## How To Use This File
- Treat checked items as "implemented or documented in the current repo", not as a guarantee that production validation is complete.
- Before marking a task done, run the smallest meaningful verification and note any gaps in the task text.
- Keep tasks grouped by workstream so future agents can pick up one coherent thread at a time.
- Add new tasks under the nearest existing workstream before creating a new category.

## 1. Repo Orientation And Local Development

Completed:
- [x] Documented the repo shape in `AGENTS.md`.
- [x] Documented practical setup and deployment notes in `USER_README.md`.
- [x] Established split local development: Vite on `5173`, FastAPI on `8000`, Vite proxying `/api`.
- [x] Added a combined Docker image path that builds the React SPA and serves it from FastAPI.
- [x] Added Docker Compose services for app, migration job, Postgres, Redis, Prometheus, Grafana, Loki, and Promtail.

Next:
- [ ] Deduplicate Python dependency sources. Root `requirements.txt` includes packages not present in `backend/requirements.txt`.
- [ ] Decide whether local backend virtualenv should be `backend/venv` or `backend/.venv`, then align docs and ignore rules.
- [ ] Review backend static SPA path handling after local and Docker runs.
- [ ] Optionally publish the Docker Postgres port for host-side DB tools.
- [ ] Add a clean local reset recipe for Docker volumes, migrations, and seeded data.

## 2. Auth, Users, And Session Boundaries

Completed:
- [x] Migrated the active app surface toward Supabase Auth.
- [x] Added `SupabaseAuthProvider` on the frontend.
- [x] Added a shared frontend API provider/client that attaches Supabase bearer tokens.
- [x] Added backend Supabase JWT validation and current-user upsert flow.
- [x] Added protected frontend routing via Supabase auth state.
- [x] Audited Supabase/Auth0 integration and wrote the Supabase-only wrap-up design in `docs/superpowers/specs/2026-05-31-supabase-auth-wrap-up-design.md`.
- [x] Fully deprecated Auth0 from active backend routes, refresh flows, and role promotion paths.
- [x] Added `/api/me` roles, wallet state, KYC state, and derived capabilities.
- [x] Added Google auth callback/error handling and documented Supabase/Google Console redirect settings.
- [x] Added email verification signup UX.
- [x] Added backend tests for Supabase JWT validation, current-user upsert, authorization summaries, KYC state mapping, Auth0 deprecation, and wallet unlink behavior.
- [x] Updated `/api/me` creator capabilities so `can_create_asset` requires clear KYC, matching the new minting policy.

Next:
- [ ] Sanitize or remove JWT payload logging in backend auth dependencies.
- [ ] Review refresh/session behavior across page reloads and API error states.
- [ ] Normalize user identity fields across backend models, frontend types, and Supabase claims.

## 3. Wallet Linking And Wallet Data

Completed:
- [x] Added backend wallet routes for nonce issue, SIWE verification, wallet list, balance read, and unlink.
- [x] Added Redis-backed SIWE nonce support.
- [x] Added frontend wallet linking UI through RainbowKit/wagmi and backend SIWE routes.
- [x] Added wallet API hooks and React Query invalidation for linked wallets and portfolio data.
- [x] Added wallet balance hooks that combine wallet/RPC context with backend token/native balance reads.
- [x] Implemented the Web3 Dashboard wallet-control cleanup in `docs/superpowers/specs/2026-05-31-wallet-control-dashboard-design.md`.
- [x] Fixed SIWE nonce generation so frontend SIWE parsing never receives `-` or `_` nonce characters.
- [x] Added linked-wallet gates for creator actions in frontend flows and backend NFT/fractional draft routes.
- [x] Added wallet nonce, allowed-chain parsing, primary-wallet, and cross-account conflict tests.
- [x] Confirmed primary-wallet behavior in tests: first linked wallet is primary; later wallets are non-primary.

Next:
- [ ] Add full backend route tests for SIWE signature validation and wallet linking through the FastAPI dependency layer.
- [ ] Add user-facing error states for expired nonces, wrong chain, wrong signer, and backend unavailability.
- [ ] Verify allowed chain handling across backend settings, wallet provider, and contract config.
- [ ] Add wallet data refresh controls or stale-state messaging in portfolio views.

## 4. NFT Minting And App Asset Lifecycle

Completed:
- [x] Added `BluemaroonNFT` mint contract and ABI export to frontend/backend.
- [x] Added backend NFT metadata route and app asset model/migration support.
- [x] Added frontend mint hook that uploads metadata, sends the mint transaction, records app transaction state, and patches minted asset state.
- [x] Added creator asset lifecycle fields in portfolio data.
- [x] Served uploaded NFT media intentionally from FastAPI `/media` for the local/MVP path.
- [x] Added backend tests for NFT media validation, metadata upload, app asset creation, linked-wallet enforcement, and minted-state patching.
- [x] Added frontend mint validation for file type, file size, missing/invalid file, wallet readiness, chain readiness, and mutation failures.
- [x] Added mint transaction lifecycle states for metadata upload, wallet confirmation, submitted, confirming, bookkeeping, mined, and failed flows.
- [x] Replaced template `Lock` tests with `BluemaroonNFT.mint` contract tests.

Next:
- [ ] Add explicit one-click retry for failed mint bookkeeping or reverted mint transactions.
- [ ] Decide when to move NFT media from local FastAPI serving to object storage/IPFS for production-style deployments.

## 5. Fractionalization And Vault Lifecycle

Completed:
- [x] Added `FractionalVault` and `VaultFactory` contracts.
- [x] Configured ABI export for vault/factory contracts.
- [x] Added backend fractional listing model and migrations.
- [x] Added backend draft/finalize routes for fractional listing lifecycle.
- [x] Added frontend fractionalization hook for approval, draft creation, factory call, transaction recording, and finalize patch.
- [x] Added contract tests for vault initialization, share minting, NFT custody transfer, factory clone creation, and duplicate deterministic vault creation.
- [x] Fixed `FractionalVault` clone name/symbol behavior so normal ERC-20 accessors work after initialization.
- [x] Added backend tests for fractional draft binding, duplicate draft rejection, exact-vault finalization, already-active conflicts, and missing-draft failure states.
- [x] Bound fractional drafts to frontend-predicted vault addresses via `vault_salt` so finalization targets the exact draft.
- [x] Added frontend fractionalization lifecycle stages for approval, draft creation, vault submission/confirmation, finalization, active, and failed states.
- [x] Added frontend `VaultCreated` event extraction and emitted-vault finalization for vault creation.
- [x] Added owned minted asset selection for fractionalization while preserving manual contract/token entry as an advanced fallback.
- [x] Added portfolio ownership data so fractionalization can list only minted assets owned by linked wallets.

Next:
- [ ] Define how fractional shares become tradable or withdrawable in the app model.

## 6. Portfolio, Holdings, And Transactions

Completed:
- [x] Added backend `/api/portfolio/me` aggregation route.
- [x] Added backend transaction record/list routes.
- [x] Added frontend `usePortfolio` hook powered by the live portfolio endpoint.
- [x] Added frontend `useTransactions` hook powered by the live transaction endpoint.
- [x] Added portfolio dashboard sections for wallets, balances, owned NFTs, creator assets, and future position slots.
- [x] Added transaction history page and CSV export surface.
- [x] Replaced mock position and holding detail flows with portfolio-derived launched creator assets.
- [x] Removed fake withdrawable balance claims from holding detail, withdrawal modal, and holding actions.
- [x] Added explicit unavailable states for portfolio NAV, holding trading metrics, and share-position gaps.

Next:
- [ ] Implement a database-backed fractional share position model for creator-retained and purchased shares.
- [ ] Implement a real withdrawable balance endpoint before re-enabling withdrawable proceeds UI.
- [ ] Add backend tests for portfolio aggregation across no-wallet, linked-wallet, and partial-provider-failure cases.
- [ ] Add backend tests for transaction create/update/list semantics and ownership boundaries.
- [ ] Add loading, empty, and partial-error states for each portfolio data section.

## 7. Marketplace, Trading, Liquidity, And Orders

Completed:
- [x] Added database model groundwork for listings, orders, transactions, and wallets.
- [x] Quarantined mock marketplace listings, featured listings, and asset detail behind unavailable states.
- [x] Replaced fake order book, open order, sell quote, and checkout data with unavailable states.

Next:
- [ ] Define the marketplace domain model for listings, bids/asks, fills, cancellations, and fees.
- [ ] Implement live listing routes or an indexed source for `useListings`, `useRecentListings`, and `useAsset`.
- [ ] Implement live REST/websocket data for `useOrderBook` and `useOpenOrders`.
- [ ] Implement `/open-orders` and cancellation semantics.
- [ ] Implement sell and withdraw contract flows, then wire `SellModal` and `WithdrawModal`.
- [ ] Add price/NAV source strategy before exposing trading metrics as real values.

## 8. KYC, Compliance, And External Services

Completed:
- [x] Added Didit-related backend settings and KYC route surface.
- [x] Added user verification model/migration groundwork.
- [x] Documented service boundaries for Supabase, Didit, Alchemy, Redis, and DB usage.
- [x] Updated Didit webhook state mapping to store provider session ids separately from app user ids and assign app roles locally.
- [x] Added KYC session-start and Didit webhook signature tests, including `X-Signature-V2` timestamp validation and legacy raw-body fallback.
- [x] Added backend creator-action guards requiring creator role, clear KYC, and linked wallet where route payloads carry wallet identity.
- [x] Applied clear-KYC requirements to NFT minting and fractionalization backend routes.
- [x] Added Web3 Dashboard creator readiness panel with wallet, creator-role, KYC, and Start KYC states.

Next:
- [ ] Add route-level webhook tests that exercise `didit_webhook` request handling end to end.
- [ ] Add readiness checks or degraded-mode behavior for external KYC provider outages.

## 9. Observability, Security, And Production Hardening

Completed:
- [x] Added Prometheus instrumentation and `/metrics` exposure.
- [x] Added Docker Compose Prometheus, Grafana, Loki, and Promtail services.
- [x] Added basic Docker app healthcheck against `/api/health`.
- [x] Added host validation middleware and configurable allowed hosts.
- [x] Documented Kubernetes transition objects and deployment sketches in `USER_README.md`.

Next:
- [ ] Fix or clarify wildcard handling for `allowed_hosts`; current default `["*"]` is not treated as a wildcard by direct membership checks.
- [ ] Add external dependency readiness checks for DB, Redis, Supabase JWKS, Alchemy, and Didit where appropriate.
- [ ] Integrate Sentry or another error monitoring path for frontend and backend.
- [ ] Move local media writes to object storage/IPFS before production-style container deployment.
- [ ] Review logs for secrets, bearer tokens, JWT payloads, private keys, and wallet signatures.
- [ ] Add deployment docs for Render/Vercel or Kubernetes once the intended target is selected.

## 10. Database And Migrations

Completed:
- [x] Added Alembic migration workflow.
- [x] Added migrations for users, wallets, verification, fractional listings, app assets, and transaction lifecycle.
- [x] Updated Alembic env to import shared model metadata through `app.models`.
- [x] Added Docker Compose migration service before app startup.
- [x] Applied the pending app-assets and transaction-lifecycle Alembic migration to the configured dev Neon database; DB schema is current at `2f4b7e9c1d2a`.
- [x] Added read-only database audit tooling in `backend/scripts/db_audit.py` and `backend/scripts/db_audit.ps1` for schema drift, table/column presence, and aggregate cleanup checks.

Next:
- [ ] Run a clean local DB from empty volume through `alembic upgrade head` and document any failures.
- [ ] Decide cleanup policy for expired fractional drafts before updating or deleting the 7 currently expired draft rows.
- [ ] Reconcile backend users with Supabase Auth users and investigate the 7 backend users currently missing email values.
- [ ] Review all relationships and cascade rules for user, wallet, transaction, listing, and asset deletion behavior.
- [ ] Add downgrade confidence or mark migrations as forward-only where that is the intended policy.
- [ ] Ensure every SQLAlchemy model is imported in `backend/app/models/__init__.py`.
- [ ] Add seed/dev data scripts only if they are useful for repeated local QA.

## 11. Testing And Quality Gates

Completed:
- [x] Root Hardhat test harness exists.
- [x] Frontend build and lint scripts exist.
- [x] Backend dependency stack supports pytest, although broad route tests are not yet present.
- [x] Agent verification expectations are documented in `AGENTS.md`.
- [x] Replaced template `Lock` contract tests with tests for the real contracts.
- [x] Added frontend smoke scripts for Vite startup, route checks, and server cleanup via `frontend/scripts/start_smoke_server.ps1`, `smoke_routes.ps1`, and `stop_smoke_server.ps1`.
- [x] Added a lightweight frontend truth-pass verifier to catch fake marketplace, position, quote, order, and withdrawable data regressions.
- [x] Added focused backend tests for the read-only DB audit helper behavior and credential-safe target reporting.
- [x] Added backend tests for creator-action guards, KYC signature verification, KYC start rows, wallet primary behavior, and KYC-gated NFT/fractional routes.

Next:
- [ ] Add backend route tests for auth, wallet linking, portfolio, transactions, NFT mint bookkeeping, fractional draft/finalize, and KYC webhooks.
- [ ] Add frontend tests for route protection, API client token injection, portfolio rendering, mint/fractionalization form states, and transaction history.
- [ ] Add browser-level assertions for rendered route text once a lightweight browser test runner is selected.
- [ ] Add CI once the primary test commands are stable.

## 12. Documentation And Agent Handoff

Completed:
- [x] Added `USER_README.md` as a practical re-entry guide.
- [x] Added `AGENTS.md` for agent-specific repo guidance.
- [x] Added this gitignored `AGENT_TODO.md` as the local workstream board.
- [x] Added `AGENT_ROLES.md` as a compact role-template registry for lightweight agent assignment.
- [x] Added tracked `docs/superpowers/` directories for specs, plans, and reviews.
- [x] Added token-aware workflow tiers, model/reasoning guidance, quiet verification wrappers, and compressed review rules.
- [x] Added wallet-control cleanup design in `docs/superpowers/specs/2026-05-31-wallet-control-dashboard-design.md`.
- [x] Added UX/database truth-pass spec and implementation plan in `docs/superpowers/specs/2026-06-07-ux-database-truth-pass-design.md` and `docs/superpowers/plans/2026-06-07-ux-database-truth-pass.md`.
- [x] Added frontend smoke verification plan in `docs/superpowers/plans/2026-06-07-frontend-smoke-verification.md`.
- [x] Added database cleanliness audit plan in `docs/superpowers/plans/2026-06-07-database-cleanliness-audit.md`.
- [x] Added KYC wallet creator-readiness spec and implementation plan in `docs/superpowers/specs/2026-06-07-kyc-wallet-creator-readiness-design.md` and `docs/superpowers/plans/2026-06-07-kyc-wallet-creator-readiness.md`.

Next:
- [ ] Review and approve `docs/superpowers/specs/2026-05-31-supabase-auth-wrap-up-design.md` before writing the implementation plan.
- [ ] Review and approve `docs/superpowers/specs/2026-05-31-wallet-control-dashboard-design.md` before writing the implementation plan.
- [ ] Keep role templates compact; prefer task contracts over adding large permanent agent files.
- [ ] Keep `README.md` and `USER_README.md` from drifting on Auth0 vs Supabase architecture.
- [ ] Move stale or historical details out of the main README when they no longer reflect the active app.
- [ ] Add diagrams only where they clarify current architecture or data flow.
- [ ] Record major completed work in tracked docs when it should persist beyond the local ignored todo.

## 13. Admin Portal And Operations

Completed:
- [x] Chose a separate `admin/` React app backed by backend `/api/admin/*` routes for operator workflows.
- [x] Documented the read-only admin portal design in `docs/superpowers/specs/2026-06-07-admin-portal-design.md`.
- [x] Documented the v1 implementation plan in `docs/superpowers/plans/2026-06-07-admin-portal-v1.md`.
- [x] Added backend admin auth gates and read-only user inspection endpoints.
- [x] Scaffolded the separate admin app shell with Supabase login, admin access checks, user search, and status summaries.
- [x] Added a Docker Compose `admin` service on port `5174` that proxies `/api` to the backend app service.

Next:
- [ ] Define a secure first-admin bootstrap process that does not expose privileged keys to the browser.
- [ ] Decide whether production admin hosting should use a static container, Vercel-style frontend hosting, or a dedicated admin subdomain.
- [ ] Add audited role mutation endpoints for creator/admin permission management.
- [ ] Add audited KYC review operations for stale, rejected, or manually reviewed sessions.
- [ ] Add admin case notes, assignees, and resolution states.
- [ ] Add admin audit views for role, KYC, wallet, and account operations.
- [ ] Add MFA or session freshness checks before privileged admin mutations.
