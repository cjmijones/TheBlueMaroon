# USER_README

This is a practical re-entry guide for TheBlueMaroon repo. It focuses on how the apps fit together, how to run local development, what Docker is currently doing, and what would need to change for a Kubernetes deployment.

## Big Picture

The repo is a full-stack Web3 commerce MVP:

| Area | Location | What it does |
| --- | --- | --- |
| FastAPI backend | `backend/app` | Supabase-protected API, wallet linking, NFT metadata upload, Alchemy asset reads, fractional listing records, KYC integration, metrics. |
| React frontend | `frontend` | Vite + React app with Supabase login, dashboard routes, React Query, RainbowKit/wagmi wallet flows, mock marketplace/portfolio pages. |
| Solidity contracts | `contracts`, `hardhat.config.ts`, `scripts/deploy.ts` | ERC-721 minting contract, fractional vault implementation, clone factory, ABI export to frontend/backend. |
| Docker ops | `Dockerfile`, `backend/ops/docker-compose.yml` | Builds one combined React + FastAPI image and starts local backing services/observability. |
| Planning/docs | `project-planning`, `README.md` | Architecture notes and older project documentation. Some old text has encoding artifacts. |

At runtime there are two main application shapes:

1. Local split-dev mode: React runs with Vite on port `5173`; FastAPI runs on port `8000`; the frontend calls the backend with `VITE_API_DEV_URL=http://localhost:8000`.
2. Docker single-image mode: the Dockerfile builds the React SPA, copies `frontend/dist` into the FastAPI image, and FastAPI serves both `/api/*` and the compiled SPA from port `8000`.

## Port Map

| Service | Port | How it starts | Notes |
| --- | ---: | --- | --- |
| Vite frontend | `5173` | `cd frontend; npm run dev` | Local development only. No Vite proxy is configured, so set `VITE_API_DEV_URL`. |
| FastAPI backend | `8000` | `uvicorn app.main:app --reload --port 8000` or Docker | API under `/api/*`; Docker also serves the compiled React SPA at `/`. |
| Docker app | `8000` | `docker compose up --build` from `backend/ops` | Combined frontend/backend image. |
| Redis | `6379` | Docker compose | Used for SIWE nonce caching. Published to host by compose. |
| Postgres | `5432` internal | Docker compose | No host port is published currently. App reaches it as `postgres:5432` inside compose network. |
| Grafana | `3000` | Docker compose | Uses `GRAFANA_USER` / `GRAFANA_PASSWORD`, defaults to admin/admin. |
| Prometheus | `9090` | Docker compose | Scrapes FastAPI metrics, but current target likely needs correction. |
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

In local compose, either point your URLs to the compose service names:

```text
DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/bluemaroon
SYNC_DATABASE_URL=postgresql://postgres:postgres@postgres:5432/bluemaroon
REDIS_URL=redis://redis:6379/0
```

Or, if running FastAPI on the host against Docker services, publish Postgres in compose and use `localhost`.

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

Set `VITE_API_DEV_URL=http://localhost:8000`. The Vite config does not define a proxy, and some code paths use raw axios with this env var directly.

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

- The compose file does not run Alembic migrations. Run `alembic upgrade head` separately or add a migration job/entrypoint step.
- `backend/prometheus.yml` currently targets `fastapi:8000`, but the compose service is named `app`. Change the target to `app:8000` or rename the service.
- Postgres is not published to the host. Add `5432:5432` if you want host tools to connect to the compose DB.
- `depends_on` controls start order, not readiness. Add healthchecks if the app starts before Postgres/Redis are ready.
- Uploaded NFT metadata/images are written to a container filesystem path (`media/nfts`). That is ephemeral unless you mount a volume or move uploads to object storage/IPFS.
- No `.dockerignore` is present. Add one before relying on frequent Docker builds so `node_modules`, virtualenvs, Hardhat artifacts, and other local outputs do not bloat the build context.

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
| `backend/app/auth/deps.py` | Supabase JWT validation, user upsert, legacy refresh helper, Redis dependency. |
| `backend/app/core/chains.py` | RPC URLs, token addresses, and contract addresses for chain reads. |
| `backend/app/core/addresses.py` | Contract/Alchemy lookup used by asset and fractional routes. |
| `backend/app/models` | SQLAlchemy models for users, wallets, listings, orders, verification, transactions, etc. |
| `backend/app/services` | Legacy Auth0 management, Alchemy, chain reads, Didit KYC helpers. |

### Backend API Routes

All paths below are prefixed with `/api`.

| Route | Backend file | Purpose |
| --- | --- | --- |
| `GET /health` | `routes_health.py` | Basic health check. |
| `GET /me` | `routes_auth.py` | Supabase-protected current user profile. Upserts user through `get_current_user`. |
| `POST /me/update-username` | `routes_username.py` | Updates current user's `name` if not taken. |
| `POST /token/refresh` | `routes_token.py` | Legacy Auth0 refresh route; Supabase refresh is handled by `supabase-js`. |
| `POST /test-tokens/refresh-and-validate` | `routes_test_tokens.py` | Dev-only token refresh/validation helper. |
| `POST /wallets/nonce` | `routes_wallets.py` | Issues Redis-backed SIWE nonce. |
| `GET /wallets/` | `routes_wallets.py` | Lists wallets for authenticated user. |
| `POST /wallets/` | `routes_wallets.py` | Verifies SIWE signature and links wallet. |
| `GET /wallets/{address}/balances` | `routes_wallets.py` | Reads native and USDC balances via RPC helper. |
| `DELETE /wallets/{address}` | `routes_wallets.py` | Unlinks wallet. |
| `POST /kyc/start` | `routes_kyc.py` | Creates a Didit verification session for current user. |
| `POST /kyc/webhook` | `routes_kyc.py` | Receives Didit webhook and updates verification state. |
| `POST /nfts/metadata` | `routes_nfts.py` | Stores uploaded image/metadata and returns token URI/image URL. |
| `GET /assets/{address}` | `routes_assets.py` | Fetches NFTs for owner through Alchemy. |
| `POST /fractional/` | `routes_fractional.py` | Creates a DB draft before on-chain fractionalization. |
| `PATCH /fractional/{vault}` | `routes_fractional.py` | Finalizes draft after vault creation transaction succeeds. |

Authentication pattern:

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
| `/dashboard` | `pages/Home` | Authenticated landing/dashboard home. Uses mock recent listings. |
| `/explore` | `pages/Explore` | Marketplace browse page. Uses mock listing hook. |
| `/asset/:id` | `pages/AssetDetail` | Asset detail page. Uses mock asset hook. |
| `/portfolio` | `pages/PortfolioDashboard` | Portfolio view. Uses mock positions/withdrawable/sell quote flows. |
| `/holding/:id` | `pages/HoldingDetail` | Holding detail/order market view. Uses mock order book/open orders. |
| `/history` | `pages/TransactionHistory` | Uses mock transaction list. |
| `/web3-commerce` | `pages/Dashboard/Web3Commerce.tsx` | Most live Web3 page: wallet balances, NFT minting, fractionalization, wallet assets. |
| `/testboard` | `components/Testboard.tsx` | Auth test page for `/api/me` and username update. |
| `/profile`, `/blank`, UI/chart routes | Various | Template/admin shell pages. |

### Frontend To Backend Mapping

| Frontend hook/component | Backend/API route | Notes |
| --- | --- | --- |
| `ApiProvider` + `lib/api.tsx` | All shared `api.*` calls | Attaches Supabase bearer token with an axios request interceptor. |
| `useUserProfile` | `GET /api/me` | Uses raw axios instead of shared `api`. |
| `Testboard` | `POST /api/me/update-username` | Uses raw axios. |
| `LinkWalletButton` | `POST /api/wallets/nonce`, then `POST /api/wallets/` | Requests Supabase token, gets nonce, asks wallet to sign SIWE message, posts signature. |
| `useWallets` | `GET /api/wallets/`, `POST /api/wallets/`, `DELETE /api/wallets/{address}` | Wallet CRUD for authenticated user. |
| `useWalletBalances` | `GET /api/wallets/{address}/balances` | Combines wagmi native balance with backend token/native aggregate. |
| `UserAssetsCard` | `GET /api/assets/{address}` | Reads Alchemy NFT inventory through backend. |
| `useMintNft` + `MintNftCard` | `POST /api/nfts/metadata`, then `BluemaroonNFT.mint` | Backend stores metadata/image, then wallet mints on-chain using returned token URI. |
| `useFractionalize` + `FractionalizeCard` | `POST /api/fractional/`, `PATCH /api/fractional/{vault}`, plus `VaultFactory` contract calls | Predicts vault, approves NFT, creates DB draft, calls factory, finalizes DB row. |
| `useRecentListings`, `useListings`, `useAsset` | None yet | Mock listing/catalog/asset data. |
| `usePositions`, `usePosition`, `useTransactions` | None yet | Mock portfolio/history data. |
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
2. Backend writes files under `media/nfts` and returns a `token_uri`.
3. Frontend calls `BluemaroonNFT.mint(token_uri)` with the connected wallet.

Fractionalization flow:

1. Frontend predicts the vault address with `VaultFactory.predictVault`.
2. Frontend verifies no bytecode exists at that predicted address.
3. Frontend approves the predicted vault to transfer the NFT.
4. Frontend creates a backend draft with `POST /api/fractional/`.
5. Frontend calls `VaultFactory.createVault`.
6. Factory clones `FractionalVault`, initializes it, transfers the NFT into the vault, and mints ERC-20 shares.
7. Frontend patches the backend with `PATCH /api/fractional/{vault}`.

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
- Frontend API access is split between the shared axios client and raw axios calls.
- Many important user-facing pages still use mock data and disabled actions.
- Docker compose does not run migrations or wait for service health.
- Runtime file uploads are local filesystem writes, which are fragile in containers.
- Tests do not yet cover the real MVP flows.

## Known Gaps And Cleanup List

1. Fix local backend static serving.
   - Make `main.py` only mount `frontend/dist` if it exists, or resolve the repo-level `frontend/dist` path during local dev.

2. Add a Vite proxy or require `VITE_API_DEV_URL`.
   - Current `lib/api.tsx` can default to `/api`, but Vite has no proxy, so `/api` on port `5173` will not reach FastAPI.

3. Unify frontend API calls.
   - Move `useUserProfile`, `Testboard`, and `LinkWalletButton` onto the shared `api` client where practical.

4. Deduplicate Python requirements.
   - Root `requirements.txt` and `backend/requirements.txt` differ. Keep one source of truth.

5. Fix compose observability target.
   - Change Prometheus target from `fastapi:8000` to `app:8000`.

6. Add migration automation.
   - Use a Docker entrypoint, separate compose job, or Kubernetes Job for Alembic.

7. Serve uploaded media intentionally.
   - `routes_nfts.py` returns `/media/nfts/...`, but `main.py` does not currently mount `/media`.
   - For production, prefer object storage/IPFS over container-local files.

8. Review small backend bugs.
   - `routes_token.py` uses `HTTPException` without importing it.
   - `routes_kyc.py` should be tested carefully; the webhook updates verification fields and appears to assign a session id into a user id field.

9. Reduce sensitive logging.
   - `get_current_user` prints JWT payloads. That is useful during development but should be removed or sanitized.

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

Before this job works cleanly, the image likely needs to include `backend/alembic`, `backend/alembic.ini`, and any model imports needed by Alembic. The current Dockerfile only copies `backend/app`.

## Suggested Next Development Order

1. Make local dev boring: fix static serving, Vite proxy/env behavior, dependency duplication, and compose Prometheus target.
2. Add database migration automation to Docker.
3. Replace mock marketplace/portfolio/trading hooks with real backend routes one page at a time.
4. Add backend tests around the route contracts before wiring more frontend UI to them.
5. Harden production storage and logging: media storage, JWT log sanitization, KYC webhook tests, healthchecks.
6. Prepare K8s manifests or Helm chart once the Docker path is stable.
