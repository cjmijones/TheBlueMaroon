# TheBlueMaroon Agent Notes

## Project Shape
- Full-stack Web3 app for NFT minting, fractionalization, portfolio views, transactions, wallet linking, and KYC flows.
- Frontend: React 19 + Vite + TypeScript in `frontend/`, with MUI, Tailwind, wagmi/viem/RainbowKit, Supabase client code, and route/page code under `frontend/src/`.
- Backend: FastAPI in `backend/app/`, async SQLAlchemy models, Alembic migrations, Redis support, Prometheus metrics, and API routers mounted under `/api`.
- Smart contracts: Hardhat + Solidity in `contracts/`, deploy script in `scripts/`, tests in `test/`, generated ABI outputs in `frontend/src/abi/` and `backend/app/abi/`.
- Docker: root `Dockerfile` builds the frontend and serves it from FastAPI; `backend/ops/docker-compose.yml` runs the app, Postgres, Redis, Prometheus, Grafana, Loki, and Promtail.

## Important Directories
- `frontend/src/pages/`: route-level React views.
- `frontend/src/components/`: reusable UI and app-specific components.
- `frontend/src/hooks/`: frontend API, wallet, portfolio, transaction, and contract hooks.
- `frontend/src/providers/`: API, wallet, and auth providers.
- `backend/app/api/`: FastAPI route modules.
- `backend/app/models/`: SQLAlchemy ORM models using the shared `Base`.
- `backend/app/db/`: DB engine/session and initialization helpers.
- `backend/alembic/versions/`: database migrations.
- `contracts/`: Solidity contracts; do not hand-edit generated artifacts as a substitute for compiling.

## Common Commands
- Root contract deps: `npm install`
- Compile contracts and refresh ABIs: `npx hardhat compile`
- Run contract tests: `npx hardhat test`
- Frontend install: `cd frontend; npm install`
- Frontend dev server: `cd frontend; npm run dev`
- Frontend build check: `cd frontend; npm run build`
- Frontend lint: `cd frontend; npm run lint`
- Backend install: `cd backend; python -m venv venv; .\venv\Scripts\pip install -r requirements.txt`
- Backend dev server: `cd backend; .\venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- Backend migrations: `cd backend; .\venv\Scripts\alembic upgrade head`
- Docker stack: `cd backend/ops; docker compose up --build`

## Environment And Secrets
- `.env` files exist locally and may contain real credentials. Never print, copy, commit, or summarize secret values.
- Frontend environment variables use the `VITE_` prefix; backend settings are loaded via Pydantic from `.env`.
- Backend migrations prefer `MIGRATION_DATABASE_URL`, then `SYNC_DATABASE_URL`, then a sync-converted `DATABASE_URL`.
- Vite proxies `/api` to `http://localhost:8000`; the backend serves the built SPA when `frontend/dist` exists.

## Development Notes
- Keep changes scoped. This repo often has user work in progress; check `git status --short` before edits and do not revert unrelated changes.
- Prefer existing route, hook, provider, and model patterns before adding new abstractions.
- When adding or changing SQLAlchemy models, import them through `backend/app/models/__init__.py` so Alembic metadata sees them.
- For backend schema changes, add an Alembic migration rather than relying on `create_all`.
- For API changes, keep frontend hooks and backend route response shapes in sync.
- For contract changes, compile with Hardhat so ABI files update through the configured exporter.
- Use ASCII in new files unless the file already intentionally uses non-ASCII.

## Verification Checklist
- Frontend-only changes: run `cd frontend; npm run build` and `cd frontend; npm run lint` when practical.
- Backend-only changes: run focused tests if present; at minimum import/start FastAPI or run affected route checks when env allows.
- DB changes: run `cd backend; .\venv\Scripts\alembic upgrade head` against the intended local DB.
- Contract changes: run `npx hardhat compile` and `npx hardhat test`.
- Full-stack changes: verify the backend on port 8000 and the Vite frontend on port 5173, especially `/api` calls.
