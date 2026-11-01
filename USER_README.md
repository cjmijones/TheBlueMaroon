# USER_README

This is a practical re-entry guide for TheBlueMaroon repo. It focuses on how the apps fit together, how to run local development, what Docker is currently doing, and what would need to change for a Kubernetes deployment.

## Big Picture

The repo is a full-stack Web3 commerce MVP:

| Area | Location | What it does |
| --- | --- | --- |
| FastAPI backend | `backend/app` | Supabase-protected API, wallet linking, NFT metadata upload, app-created asset tracking, app transaction history, Alchemy asset reads, fractional listing records, KYC integration, metrics. |
| React frontend | `frontend` | Vite + React app with Supabase login, dashboard routes, React Query, RainbowKit/wagmi wallet flows, live wallet/portfolio surfaces, and mock marketplace/trading pages. |
| Solidity contracts | `contracts`, `hardhat.config.ts`, `scripts/deploy.ts` | ERC-721 minting contract, fractional vault implementation, clone factory, ABI export to frontend/backend. |
| Docker ops | `Dockerfile`, `backend/ops/docker-compose.yml` | Builds one combined React + FastAPI image and starts local backing services/observability. |
| Planning/docs | `project-planning`, `README.md` | Architecture notes and older project documentation. Some old text has encoding artifacts. |

At runtime there are two main application shapes:

1. Local split-dev mode: React runs with Vite on port `5173`; FastAPI runs on port `8000`; Vite proxies `/api` to the backend. `VITE_API_DEV_URL` is optional and can still point directly at `http://localhost:8000` if you want to bypass the proxy.
2. Docker single-image mode: the Dockerfile builds the React SPA, copies `frontend/dist` into the FastAPI image, and FastAPI serves both `/api/*` and the compiled SPA from port `8000`.

## Port Map

| Service | Port | How it starts | Notes |
| --- | ---: | --- | --- |
| Vite frontend | `5173` | `cd frontend; npm run dev` | Local development only. Proxies `/api` to `http://localhost:8000`. |
| FastAPI backend | `8000` | `uvicorn app.main:app --reload --port 8000` or Docker | API under `/api/*`; Docker also serves the compiled React SPA at `/`. |
| Docker app | `8000` | `docker compose up --build` from `backend/ops` | Combined frontend/backend image. |
| Redis | `6379` | Docker compose | Used for SIWE nonce caching. Published to host by compose. |
| Postgres | `5432` internal | Docker compose | No host port is published currently. App reaches it as `postgres:5432` inside compose network. |
| Grafana | `3000` | Docker compose | Uses `GRAFANA_USER` / `GRAFANA_PASSWORD`, defaults to admin/admin. |
| Prometheus | `9090` | Docker compose | Scrapes FastAPI metrics from `app:8000`. |
| Loki | `3100` | Docker compose | Receives logs from Promtail. |
| Hardhat local node | `8545` | `npx hardhat node` | Optional if you want a local chain. Current config is oriented around Sepolia/mainnet RPCs. |

## Environment Files

There are three environment surfaces. Keep secrets out of Git.

| File | Used by | Purpose |
| --- | --- | --- |
| `.env` at repo root | Hardhat | RPC URLs and private keys for contract deployment. |
| `backend/.env` | FastAPI and Docker compose | Supabase Auth, Didit, DB URLs, Redis URL, Alchemy URLs, contract addresses, observability vars. |
| `frontend/.env` | Vite | Public browser config: Supabase client info, API URL, WalletConnect project ID, Alchemy client URLs, deployed contract addresses. |

Important frontend values:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_ENV_TYPE=dev
VITE_API_DEV_URL=http://localhost:8000
VITE_API_PROD_URL=
VITE_WC_PROJECT_ID=
VITE_ALCHEMY_SEPOLIA=
VITE_ALCHEMY_MAINNET=
VITE_NFT_SEPOLIA=
VITE_FACTORY_SEPOLIA=
VITE_VAULT_IMPL_SEPOLIA=
VITE_NFT_MAINNET=
VITE_FACTORY_MAINNET=
VITE_VAULT_IMPL_MAINNET=
```

Important backend values:

```text
ENV_TYPE=dev
DEBUG=true
ALLOWED_HOSTS=["localhost","127.0.0.1"]
DATABASE_URL=postgresql+asyncpg://...
NEON_DATABASE_URL=postgresql+asyncpg://...
SYNC_DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379/0
SUPABASE_URL=
SUPABASE_JWKS_URL=
SUPABASE_JWT_AUDIENCE=authenticated
SIWE_ALLOWED_CHAINS=[11155111,1]
DIDIT_CLIENT_ID=
DIDIT_CLIENT_SECRET=
DIDIT_API_KEY=
DIDIT_WEBHOOK_SECRET=
ALCHEMY_ETH_SEPOLIA_URL=
ALCHEMY_ETH_MAINNET_URL=
NFT_SEPOLIA_ADDRESS=
FACTORY_SEPOLIA_ADDRESS=
VAULT_IMPL_SEPOLIA=
PUBLIC_BASE_URL=http://localhost:8000
```

Use `SUPABASE_JWKS_URL` for the recommended Supabase signing-keys flow. `SUPABASE_JWT_SECRET` is supported by the backend only as a fallback for legacy shared-secret projects.

For Docker compose, `backend/ops/docker-compose.yml` uses `env_file: ../.env`, which resolves to `backend/.env` when compose is run from `backend/ops`.
The compose app service overrides `ENV_TYPE=docker` and clears `NEON_DATABASE_URL` so the running app uses the same local Postgres service that the `migrate` container upgrades. Without that override, `ENV_TYPE=dev` makes `backend/app/core/config.py` prefer Neon when `NEON_DATABASE_URL` is present.

## Supabase Auth Dashboard Checklist

The active app code sends Supabase email and Google OAuth redirects to:

```text
<app-origin>/auth/callback
```

Configure Supabase Auth before testing those flows:

- In Supabase Authentication URL Configuration, set Site URL to the active app origin for the environment.
- Add exact redirect URLs for each environment, including `http://localhost:5173/auth/callback` for split local development and the production equivalent.
- Enable Confirm Email if email verification is required before normal sign-in. With Confirm Email enabled, password signup can return no browser session; the login page now shows a check-email state for that case.
- Enable the Google provider in Supabase and add its client ID and client secret.
- In Google Cloud Console, register the Supabase provider callback URL, which is shaped like `https://<project-ref>.supabase.co/auth/v1/callback`; this is different from the app's `/auth/callback` URL.
- If email templates customize confirmation links and use `redirectTo`, make sure templates honor Supabase's redirect target rather than hard-coding the Site URL.

Reference docs: [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) and [Supabase Google login](https://supabase.com/docs/guides/auth/social-login/auth-google).

## Install Dependencies

From the repo root:

```powershell
npm install
```

That installs the root Hardhat dependencies.

For the frontend:

```powershell
cd frontend
npm install --legacy-peer-deps
```

The Dockerfile uses `--legacy-peer-deps`, so using the same install mode locally avoids peer dependency churn.

For the backend:

```powershell
cd ..
py -3.12 -m venv backend\.venv
backend\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Use the root `requirements.txt` for now. It includes packages the app imports, such as `redis` and `python-multipart`, that are not currently present in `backend/requirements.txt`.

## Database Setup

The backend uses SQLAlchemy async sessions for the app and Alembic for migrations.

Run migrations from the `backend` directory so Alembic can find `backend/alembic.ini`:

```powershell
cd backend
.venv\Scripts\Activate.ps1
alembic upgrade head
```

Alembic reads `SYNC_DATABASE_URL` from `backend/.env`. The running FastAPI app reads `DATABASE_URL` or `NEON_DATABASE_URL` through `backend/app/core/config.py`.

Docker compose has a dedicated `migrate` service that runs `alembic upgrade head` before the app starts:

```powershell
cd backend/ops
docker compose up --build
```

For a one-off migration check against the compose database:

```powershell
docker compose run --rm migrate
```

In local compose, either point your URLs to the compose service names:

```text
DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/bluemaroon
SYNC_DATABASE_URL=postgresql://postgres:postgres@postgres:5432/bluemaroon
REDIS_URL=redis://redis:6379/0
```

Or, if running FastAPI on the host against Docker services, publish Postgres in compose and use `localhost`.

The current database boundary is intentionally narrow:

- Store Supabase-backed users, linked wallets, KYC status, app-created assets, app-initiated transaction records, and fractional listing/vault lifecycle rows.
- Do not store live wallet balances or full wallet NFT inventories. Those are read from RPC/Alchemy when the portfolio needs a refresh.
- Use `transactions` as an application ledger of actions the app initiated or needs to display, not as a complete block explorer index.
- Use `app_assets` for creator asset lifecycle before and during minting; use `fractional_listings` when an NFT enters the fractionalization flow.

## Run Local Development

### Frontend

```powershell
cd frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:8000`, so `VITE_API_DEV_URL` can be left blank for normal split-dev. If you set `VITE_API_DEV_URL=http://localhost:8000`, the shared API client will call the backend directly at `http://localhost:8000/api`.

### Backend

The intended local command is:

```powershell
cd backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open:

```text
http://localhost:8000/api/health
http://localhost:8000/docs
http://localhost:8000/metrics
```

Current local-dev caveat: `backend/app/main.py` mounts the compiled SPA at import time using this path:

```text
backend/frontend/dist/assets
```

Docker creates the equivalent path inside the image, but the repo currently has `frontend/dist`, not `backend/frontend/dist`. If local Uvicorn fails with a static directory error, either run through Docker, copy a built frontend into `backend/frontend/dist`, or update `main.py` to only mount the SPA when the directory exists.

### Smart Contracts

Compile and export ABIs:

```powershell
npx hardhat compile
```

This exports selected ABIs to:

```text
frontend/src/abi
backend/app/abi
```

Run tests:

```powershell
npx hardhat test
```

Deploy with the script:

```powershell
npx hardhat run scripts/deploy.ts --network sepolia
```

After deployment, copy the printed addresses into both backend and frontend env files.

## Docker Workflow

Start the stack:

```powershell
cd backend\ops
docker compose up --build
```

The root `Dockerfile` is a two-stage build:

1. `frontend-build`: installs frontend dependencies, runs `npm run build`, and produces `frontend/dist`.
2. `backend-build`: installs Python dependencies from the root `requirements.txt`, copies `backend/app`, copies the built SPA into `/app/frontend/dist`, exposes port `8000`, and runs Uvicorn.

The compose file starts:

| Compose service | Purpose |
| --- | --- |
| `app` | Combined FastAPI + compiled React SPA. |
| `migrate` | One-shot Alembic migration service. Runs before `app`. |
| `postgres` | Local Postgres database. |
| `redis` | SIWE nonce cache. |
| `prometheus` | Metrics scraper. |
| `grafana` | Dashboard UI. |
| `loki` | Log storage. |
| `promtail` | Log shipper. |

Open the app at:

```text
http://localhost:8000
```

Open the API health route at:

```text
http://localhost:8000/api/health
```

Docker watch-outs:

- The compose file now includes a `migrate` service that runs `alembic upgrade head` after Postgres is healthy and before the app starts. It sets `MIGRATION_DATABASE_URL` from the compose Postgres env values so it does not accidentally migrate a remote `SYNC_DATABASE_URL`.
- `backend/prometheus.yml` targets `app:8000`, matching the compose service name.
- Postgres is not published to the host. Add `5432:5432` if you want host tools to connect to the compose DB.
- Postgres, Redis, and the app have basic healthchecks. `depends_on` now waits for Postgres/Redis health and migration completion.
- Uploaded NFT metadata/images are written to a container filesystem path (`media/nfts`). That is ephemeral unless you mount a volume or move uploads to object storage/IPFS.
- A root `.dockerignore` keeps local dependencies, build outputs, logs, and env files out of the Docker build context.

## Backend Architecture

Entry point:

```text
backend/app/main.py
```

Startup behavior:

- Loads settings with `pydantic-settings` from `.env`.
- Sets logging.
- Instruments FastAPI for Prometheus and exposes `/metrics`.
- Adds host validation and CORS.
- Registers all API routers under `/api`.
- Serves compiled React assets at `/assets`.
- Returns `index.html` for non-API routes so client-side React routing works in Docker/prod.

Core backend modules:

| Module | Purpose |
| --- | --- |
| `backend/app/core/config.py` | Pydantic settings and environment variable mapping. |
| `backend/app/db/session.py` | Async SQLAlchemy engine/session setup. Uses Neon SSL when URL contains `neon.tech`. |
| `backend/app/auth/deps.py` | Supabase JWT validation, current-user upsert, and Redis dependency. |
| `backend/app/core/chains.py` | RPC URLs, token addresses, and contract addresses for chain reads. |
| `backend/app/core/addresses.py` | Contract/Alchemy lookup used by asset and fractional routes. |
| `backend/app/models` | SQLAlchemy models for users, wallets, listings, orders, verification, transactions, etc. |
| `backend/app/services` | Alchemy, chain reads, Didit KYC helpers, and other external service adapters. |

### Backend API Routes

All paths below are prefixed with `/api`.

| Route | Backend file | Purpose |
| --- | --- | --- |
| `GET /health` | `routes_health.py` | Basic health check. |
| `GET /me` | `routes_auth.py` | Supabase-authenticated app profile with roles, wallet state, KYC state, and derived capabilities. |
| `POST /me/update-username` | `routes_username.py` | Updates current user's `name` if not taken. |
| `POST /wallets/nonce` | `routes_wallets.py` | Issues Redis-backed SIWE nonce. |
| `GET /wallets/` | `routes_wallets.py` | Lists wallets for authenticated user. |
| `POST /wallets/` | `routes_wallets.py` | Verifies SIWE signature and links wallet. |
| `GET /wallets/{address}/balances` | `routes_wallets.py` | Reads native and USDC balances via RPC helper. |
| `DELETE /wallets/{address}` | `routes_wallets.py` | Unlinks wallet. |
| `POST /kyc/start` | `routes_kyc.py` | Creates a Didit verification session for current user. |
| `POST /kyc/webhook` | `routes_kyc.py` | Receives Didit webhook and updates verification state. |
| `POST /nfts/metadata` | `routes_nfts.py` | Stores uploaded image/metadata, creates an `app_assets` row, and returns asset/token URI/image URL. |
| `PATCH /nfts/assets/{asset_id}/minted` | `routes_nfts.py` | Marks an app-created asset as mint submitted/minted after the wallet transaction is sent. |
| `GET /assets/{address}` | `routes_assets.py` | Fetches NFTs for owner through Alchemy. |
| `GET /portfolio/me` | `routes_portfolio.py` | Aggregates the current user's wallets, balances, owned NFTs, creator assets, and future position slots. |
| `POST /transactions/` | `routes_transactions.py` | Records or updates an app-initiated on-chain transaction for the current user. |
| `GET /transactions/` | `routes_transactions.py` | Lists app-initiated transactions for the current user. |
| `POST /fractional/` | `routes_fractional.py` | Creates a DB draft before on-chain fractionalization. |
| `PATCH /fractional/{vault}` | `routes_fractional.py` | Finalizes draft after vault creation transaction succeeds. |

Authentication pattern:

- Supabase is the only active identity provider. The frontend keeps Supabase refresh tokens inside `supabase-js`; the backend accepts only bearer access tokens and validates them as Supabase JWTs. There is no backend refresh-token exchange endpoint.
- Most business routes depend on `get_current_user`.
- `get_current_user` validates a Supabase JWT, upserts the user in Postgres, and updates `last_login`.
- SIWE wallet linking is not standalone auth. It is a Supabase-authenticated user proving control of a wallet by signing a nonce.

## Frontend Architecture

Entry points:

```text
frontend/src/main.tsx
frontend/src/App.tsx
```

Provider stack:

1. `ThemeProvider`
2. `SupabaseAuthProvider`
3. `ApiProvider`
4. `AppWrapper`
5. `App`
6. `WalletProvider`
7. `ChainContext`
8. React Router

Important frontend modules:

| Module | Purpose |
| --- | --- |
| `frontend/src/lib/supabase.ts` | Supabase browser client. |
| `frontend/src/lib/api.tsx` | Shared axios instance. Computes `/api` base URL, injects Supabase bearer token, handles global errors. |
| `frontend/src/providers/ApiProvider.tsx` | Creates React Query client and wires axios interceptors to Supabase Auth. |
| `frontend/src/providers/WalletProvider.tsx` | Configures wagmi + RainbowKit for Sepolia and mainnet. |
| `frontend/src/context/ChainContext.tsx` | Supplies default chain ID: Sepolia in dev, mainnet in production. |
| `frontend/src/lib/addresses.tsx` | Reads deployed contract addresses from Vite env vars. |
| `frontend/src/layout/PrivateAppLayout.tsx` | Wraps private routes with `ProtectedRoute` and the app shell. |
| `frontend/src/components/auth/ProtectedRoute.tsx` | Redirects unauthenticated users to `/`. |

### Frontend Routes

| Route | Page/component | Current behavior |
| --- | --- | --- |
| `/` | `components/Login.tsx` | Supabase login page. Redirects authenticated users to `/dashboard`. |
| `/auth/callback` | `components/auth/AuthCallback.tsx` | Supabase OAuth/email confirmation callback surface. Finishes session redirects or shows auth errors. |
| `/dashboard` | `pages/Home` | Authenticated landing/dashboard home. Uses mock recent listings. |
| `/explore` | `pages/Explore` | Marketplace browse page. Uses mock listing hook. |
| `/asset/:id` | `pages/AssetDetail` | Asset detail page. Uses mock asset hook. |
| `/portfolio` | `pages/PortfolioDashboard` | Portfolio view. Uses live wallet balances, Alchemy NFT reads, app asset lifecycle rows, and placeholder future position slots. |
| `/holding/:id` | `pages/HoldingDetail` | Holding detail/order market view. Uses mock order book/open orders. |
| `/history` | `pages/TransactionHistory` | Lists app-recorded transactions from the backend. |
| `/web3-commerce` | `pages/Dashboard/Web3Commerce.tsx` | Most live Web3 page: wallet balances, NFT minting, fractionalization, wallet assets. |
| `/testboard` | `components/Testboard.tsx` | Auth test page for `/api/me` and username update. |
| `/profile`, `/blank`, UI/chart routes | Various | Template/admin shell pages. |

### Frontend To Backend Mapping

| Frontend hook/component | Backend/API route | Notes |
| --- | --- | --- |
| `ApiProvider` + `lib/api.tsx` | All shared `api.*` calls | Attaches Supabase bearer token with an axios request interceptor. |
| `useUserProfile` | `GET /api/me` | Uses the shared `api` client. |
| `Testboard` | `POST /api/me/update-username` | Uses the shared `api` client. |
| `LinkWalletButton` | `POST /api/wallets/nonce`, then `POST /api/wallets/` | Requests Supabase token, gets nonce, asks wallet to sign SIWE message, posts signature. |
| `useWallets` | `GET /api/wallets/`, `POST /api/wallets/`, `DELETE /api/wallets/{address}` | Wallet CRUD for authenticated user. |
| `useWalletBalances` | `GET /api/wallets/{address}/balances` | Combines wagmi native balance with backend token/native aggregate. |
| `UserAssetsCard` | `GET /api/assets/{address}` | Reads Alchemy NFT inventory through backend. |
| `usePortfolio` | `GET /api/portfolio/me` | Powers the portfolio dashboard with linked wallets, balances, owned NFTs, creator drafts/launched assets, and empty fractional position slots. |
| `useMintNft` + `MintNftCard` | `POST /api/nfts/metadata`, `POST /api/transactions/`, `PATCH /api/nfts/assets/{asset_id}/minted`, then `BluemaroonNFT.mint` | Backend stores metadata/image and an app asset row; frontend submits the mint and records the app transaction. |
| `useFractionalize` + `FractionalizeCard` | `POST /api/fractional/`, `PATCH /api/fractional/{vault}`, `POST /api/transactions/`, plus `VaultFactory` contract calls | Predicts vault, approves NFT, creates DB draft, calls factory, records approve/vault transactions, finalizes DB row. |
| `useTransactions` | `GET /api/transactions/` | Powers the transaction history page with app-recorded on-chain actions. |
| `useRecentListings`, `useListings`, `useAsset` | None yet | Mock listing/catalog/asset data. |
| `usePositions`, `usePosition` | None yet | Mock portfolio position data. |
| `useOrderBook`, `useOpenOrders`, `useSellQuote`, `useWithdrawable` | None yet | Mock trading/liquidity data and disabled modal actions. |

## Smart Contract Flow

Contracts:

| Contract | Purpose |
| --- | --- |
| `BluemaroonNFT` | Simple ERC-721 with `mint(tokenURI)`. |
| `FractionalVault` | ERC-20 vault clone that holds one NFT and mints fungible shares to the original owner. |
| `VaultFactory` | Deterministic minimal-proxy factory for one vault per `(nft, tokenId, creator)`. |

Mint flow:

1. Frontend uploads metadata/image to `POST /api/nfts/metadata`.
2. Backend writes files under `media/nfts`, creates an `app_assets` lifecycle row, and returns an `asset_id` plus `token_uri`.
3. Frontend calls `BluemaroonNFT.mint(token_uri)` with the connected wallet.
4. Frontend records the mint transaction in `POST /api/transactions/`.
5. Frontend patches `PATCH /api/nfts/assets/{asset_id}/minted` so the creator asset pipeline can show the mint state.

Fractionalization flow:

1. Frontend predicts the vault address with `VaultFactory.predictVault`.
2. Frontend verifies no bytecode exists at that predicted address.
3. Frontend approves the predicted vault to transfer the NFT.
4. Frontend records the approval transaction in `POST /api/transactions/`.
5. Frontend creates a backend draft with `POST /api/fractional/`.
6. Frontend calls `VaultFactory.createVault`.
7. Factory clones `FractionalVault`, initializes it, transfers the NFT into the vault, and mints ERC-20 shares.
8. Frontend patches the backend with `PATCH /api/fractional/{vault}` and records the vault transaction.

## Does The Current Setup Make Sense?

Yes, as an MVP shape, the major pieces are coherent:

- Supabase handles identity.
- Backend owns protected user/wallet/KYC/database workflows.
- Redis is used for one-time SIWE nonce verification.
- React Query is the right fit for API/cache state.
- wagmi/RainbowKit are appropriate for wallet and contract interactions.
- Hardhat ABI export keeps frontend/backend contract interfaces in sync.
- The single Docker image is convenient for simple deployment.

The parts that most need cleanup before future development:

- Local backend startup currently assumes a Docker-style SPA path.
- Frontend API access for the core auth/wallet flows now goes through the shared axios client.
- Marketplace, holding detail, and trading/liquidity pages still use mock data and disabled actions.
- Docker compose now runs migrations and has basic health checks; production readiness still needs stronger external dependency checks.
- Runtime file uploads are local filesystem writes, which are fragile in containers.
- Tests do not yet cover the real MVP flows.

## Known Gaps And Cleanup List

1. Fix local backend static serving.
   - Make `main.py` only mount `frontend/dist` if it exists, or resolve the repo-level `frontend/dist` path during local dev.

2. Keep frontend API access on the shared API client.
   - Vite now proxies `/api` to FastAPI, and the shared API client attaches Supabase bearer tokens.

3. Unify frontend API calls.
   - Move `useUserProfile`, `Testboard`, and `LinkWalletButton` onto the shared `api` client where practical.

4. Deduplicate Python requirements.
   - Root `requirements.txt` and `backend/requirements.txt` differ. Keep one source of truth.

5. Continue hardening compose.
   - Prometheus now targets `app:8000`; next improvements would be optional host Postgres publishing and stricter readiness checks for external dependencies.

6. Keep migration automation aligned with deployment.
   - Docker compose now uses a separate `migrate` service. Kubernetes should use the same idea as a `Job`.

7. Serve uploaded media intentionally.
   - `routes_nfts.py` returns `/media/nfts/...`, but `main.py` does not currently mount `/media`.
   - For production, prefer object storage/IPFS over container-local files.

8. Review small backend bugs.
   - Keep expanding KYC tests beyond the current Didit state-mapping coverage, especially around webhook signature failures and missing verification rows.

9. Reduce sensitive logging.
   - Continue reviewing auth, SIWE, KYC, and transaction logs for tokens, signatures, full wallet addresses, and third-party payloads.

10. Expand tests.
   - Current contract tests are for the template `Lock` contract, not `BluemaroonNFT`, `VaultFactory`, or `FractionalVault`.
   - Add backend route tests for Supabase auth dependencies, wallet nonce/linking, fractional draft/finalize, and KYC webhook signature checks.
   - Add frontend tests around route protection and the live Web3 hooks.

11. Review host validation.
   - `allowed_hosts` defaults to `["*"]`, but `main.py` checks direct membership rather than treating `*` as a wildcard. Use `DEBUG=true` locally or set explicit hostnames until this is adjusted.

## Kubernetes Transition

The current Dockerfile can be deployed to Kubernetes as a single `app` container that serves both API and frontend. That is the simplest migration path.

Minimal K8s objects:

| Object | Purpose |
| --- | --- |
| `Namespace` | Isolate the app resources. |
| `Deployment` | Run the FastAPI/SPA image. |
| `Service` | Expose port `8000` inside the cluster. |
| `Ingress` | Public host, TLS, path routing to the app service. |
| `Secret` | Supabase secrets, Didit secrets, DB URLs, private service credentials. |
| `ConfigMap` | Non-secret settings like `ENV_TYPE`, `PUBLIC_BASE_URL`, allowed hosts, chain IDs. |
| `Job` | Run `alembic upgrade head` before or during deployment. |
| `Deployment` or managed service for Redis | SIWE nonce cache. |
| Managed Postgres or StatefulSet | Prefer managed Postgres for production. |
| `HorizontalPodAutoscaler` | Scale app pods on CPU/memory or custom metrics. |

Recommended production shape:

1. Use managed Postgres instead of in-cluster Postgres.
2. Use managed Redis if available.
3. Move NFT media/metadata writes to object storage or IPFS.
4. Put React static assets on CDN/object storage eventually, or keep the current single-image setup for simplicity.
5. Use a migration `Job` instead of running migrations in every app pod.
6. Add readiness/liveness probes:

```yaml
readinessProbe:
  httpGet:
    path: /api/health
    port: 8000
livenessProbe:
  httpGet:
    path: /api/health
    port: 8000
```

7. Expose Prometheus metrics at `/metrics`.
8. Use Helm charts or an existing platform stack for Prometheus/Grafana/Loki rather than hand-maintaining all observability YAML.
9. Remember that Vite variables are baked at frontend build time. Changing `VITE_*` values in a K8s Secret after the image is built will not update the browser bundle. Rebuild the frontend image or implement runtime config injection.

Single-image K8s deployment sketch:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: blue-maroon-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: blue-maroon-app
  template:
    metadata:
      labels:
        app: blue-maroon-app
    spec:
      containers:
        - name: app
          image: your-registry/the-blue-maroon:latest
          ports:
            - containerPort: 8000
          envFrom:
            - configMapRef:
                name: blue-maroon-config
            - secretRef:
                name: blue-maroon-secrets
          readinessProbe:
            httpGet:
              path: /api/health
              port: 8000
          livenessProbe:
            httpGet:
              path: /api/health
              port: 8000
```

Service sketch:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: blue-maroon-app
spec:
  selector:
    app: blue-maroon-app
  ports:
    - name: http
      port: 80
      targetPort: 8000
```

Migration job sketch:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: blue-maroon-migrate
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: your-registry/the-blue-maroon:latest
          workingDir: /app
          command: ["alembic", "upgrade", "head"]
          envFrom:
            - secretRef:
                name: blue-maroon-secrets
```

The current Dockerfile includes the Alembic directory and `alembic.ini`, so this job can reuse the same image as the app container.

## Suggested Next Development Order

1. Finish local-dev cleanup: dependency duplication, optional Postgres host publishing, media serving, and any static-serving edge cases that still show up.
2. Replace mock marketplace, holding, and trading hooks with real backend routes one page at a time.
3. Add backend tests around auth, wallet linking, portfolio aggregation, app transactions, mint bookkeeping, and fractional draft/finalize.
4. Harden production storage and logging: object storage/IPFS for media, JWT log sanitization, KYC webhook tests, readiness checks.
5. Prepare K8s manifests or Helm chart once the Docker path is stable.
