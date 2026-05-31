# TheBlueMaroon Agent Role Templates

These are lightweight role templates for planning and dispatching focused work in this repo. They are not standalone authorities, and they should not grow into giant agent files. Each role is a small lens: what to read first, what it may change, who it coordinates with, and how it proves the work.

## Operating Rules
- Start with `AGENTS.md`, then read root `AGENT_TODO.md` if it exists.
- Use one role as the lead and add supporting roles only when the task crosses boundaries.
- Keep the task contract narrower than the role. A role says "what this agent is good at"; a task contract says "what this agent is doing now."
- Before editing, state the intended files and verification command.
- If a task needs edits outside the role's allowed area, stop and hand back to the coordinator.
- Return changed files, verification evidence, remaining risks, and suggested next owner.

## Token-Aware Agent Workflow

Use subagents deliberately. The coordinator owns high-level reasoning, task splitting, model choice, and final synthesis. Subagents should receive narrow task contracts, limited context, and concise return formats.

### Workflow Tiers
- **Tier 0 - Inline:** docs, comments, typo fixes, small config edits, or one-line mechanical changes. Do not spawn a subagent. Run readback/search or the smallest meaningful check.
- **Tier 1 - Single helper:** one bounded code area, no security/money/schema risk. Use one worker or one reviewer, not both. Run focused verification only.
- **Tier 2 - Paired implementation/review:** medium feature, several files in one domain, or contract changes between frontend/backend. Use one worker and one reviewer, or do it inline with one review pass.
- **Tier 3 - Full gate:** auth, wallet custody, KYC/compliance, payments/transactions, contracts, migrations, production deployment, or broad refactors. Use full staged review and stronger verification.

### Model And Reasoning Ladder
- **Coordinator:** strongest available model only for planning, cross-domain reasoning, conflict resolution, and final synthesis.
- **Mechanical worker:** smaller or older model, low reasoning, narrow context, no subagent spawning.
- **Explorer:** smaller or older model, low reasoning, read-only, exact question only.
- **Small reviewer:** smaller model, low/medium reasoning, findings-only output for Tier 1 or Tier 2.
- **Critical reviewer:** stronger model, medium/high reasoning, only for Tier 3 or explicit security/release review.

### Context And Prompt Caching
- Keep reusable role instructions stable and short so prompt prefixes can be cached.
- Put static instructions first, then task contract, then variable file excerpts and command output.
- Pass file paths and focused excerpts instead of whole docs. Do not paste full `AGENT_TODO.md` or full plans unless the task truly needs them.
- Prefer exact output schemas over prose instructions when a subagent return can be structured.

### Evidence Budgets
- Each task contract must name the smallest meaningful verification before work starts.
- Docs-only changes: readback, link/path check, or targeted `rg`.
- Backend helper changes: focused unit tests.
- Backend route changes: focused route tests plus import smoke when practical.
- Frontend type/data changes: typecheck or build; lint when touched files affect lint surface.
- Frontend visual behavior: build plus browser check only when user-facing UI changed.
- Full-stack/security changes: focused tests, source-boundary search, and review summary.

### Quiet Verification
- Prefer quiet wrappers for successful checks:
  - `backend/scripts/verify_quiet.ps1`
  - `frontend/scripts/verify_quiet.ps1`
- Quiet wrappers write full logs under `.agent/logs/` and print only pass/fail summaries unless a command fails.
- If a raw command is required, use quiet flags where available, such as `pytest -q --tb=short --disable-warnings` or `eslint --quiet` when warnings are not relevant.

### Review Compression
- Reviewers return findings first, ordered by severity, with file/line references.
- If clean, reviewers say `No blocking issues found` and list only residual risks.
- Avoid restating the whole task, praising the work, or pasting successful command logs.
- Tier 0 usually needs no reviewer. Tier 1 gets at most one reviewer. Tier 3 may use staged reviews.

### Scope Locks
- Every subagent contract must include allowed edits, forbidden edits, max files to inspect unless blocked, max verification commands, and a stop condition.
- Subagents may not spawn more agents unless the coordinator explicitly grants that ability.
- If the task exceeds scope, the subagent stops and returns the blocker instead of broadening the work.

### Config Hygiene
- Update `AGENTS.md`, `AGENT_ROLES.md`, `AGENT_TODO.md`, or `docs/superpowers/` when workflow rules or verification commands change.
- Keep role templates compact. Add task-specific instructions to task contracts, not permanent role files.
- Record unusual local tool failures, command shims, or verification caveats in review artifacts so future agents do not rediscover them.

## Task Contract Template

```md
Agent: <role-name>
Mission: <one concrete outcome>
Tier: <0|1|2|3 and reason>
Model/reasoning: <suggested model class and effort>
Read first: <files or directories>
Allowed edits: <paths>
Do not edit: <paths or domains>
Coordinate with: <roles>
Context budget: <max files/excerpts and what to avoid>
Verification budget: <smallest meaningful command(s)>
Done when: <observable completion condition>
Verify: <command or manual check>
Return: changed files, concise verification summary, risks, next task
```

## Core Roles

### coordinator-agent
- Purpose: Triage work, choose role composition, split cross-cutting changes, and verify final handoff.
- Read first: `AGENTS.md`, `AGENT_ROLES.md`, `AGENT_TODO.md`, `USER_README.md`.
- Allowed edits: Planning docs only, unless explicitly implementing a tiny docs change.
- Coordinates with: All roles.
- Verify: Confirms each delegated task has evidence and no role exceeded scope.
- Return: Assignment plan, dependency order, verification summary.

### repo-steward
- Purpose: Keep repo guidance, local setup, dependency drift notes, and handoff docs coherent.
- Read first: `AGENTS.md`, `AGENT_TODO.md`, `USER_README.md`, `.gitignore`, root manifests.
- Allowed edits: `AGENTS.md`, `AGENT_ROLES.md`, `USER_README.md`, `README.md`, `.gitignore`, setup docs.
- Coordinates with: `ops-observability-agent`, `qa-verification-agent`.
- Verify: Readback of changed docs plus relevant git ignore/status checks.
- Return: Documentation changes, drift found, follow-up workstreams.

### backend-api-agent
- Purpose: FastAPI routes, auth dependencies, service boundaries, response contracts, and route tests.
- Read first: `backend/app/main.py`, relevant `backend/app/api/*`, `backend/app/auth/*`, `backend/app/db/session.py`.
- Allowed edits: `backend/app/api/`, `backend/app/auth/`, `backend/app/core/`, `backend/app/services/`, backend tests.
- Coordinates with: `frontend-data-agent`, `database-migrations-agent`, `wallet-auth-agent`.
- Verify: Focused backend tests, FastAPI import/start check, or route-level smoke check.
- Return: Endpoint contract changes, tests run, frontend impact.

### database-migrations-agent
- Purpose: SQLAlchemy models, Alembic migrations, relationships, indexes, and upgrade safety.
- Read first: `backend/app/models/`, `backend/alembic/env.py`, `backend/alembic/versions/`.
- Allowed edits: `backend/app/models/`, `backend/alembic/`, DB-related docs.
- Coordinates with: `backend-api-agent`, `qa-verification-agent`.
- Verify: `alembic upgrade head` against the intended local DB or a documented blocker.
- Return: Schema changes, migration order, downgrade policy, verification result.

### frontend-product-agent
- Purpose: Route-level UI, component behavior, user-facing states, accessibility, and interaction polish.
- Read first: `frontend/src/pages/`, `frontend/src/components/`, `frontend/src/layout/`, `frontend/src/App.tsx`.
- Allowed edits: `frontend/src/pages/`, `frontend/src/components/`, `frontend/src/layout/`, styling files.
- Coordinates with: `frontend-data-agent`, `wallet-auth-agent`, `marketplace-agent`.
- Verify: `cd frontend; npm run build`, `cd frontend; npm run lint`, and browser check for visual work.
- Return: UI states covered, screenshots or browser notes when relevant, test/build output.

### frontend-data-agent
- Purpose: Hooks, React Query behavior, shared API client, token injection, and mock-to-live data migration.
- Read first: `frontend/src/hooks/`, `frontend/src/lib/api.tsx`, `frontend/src/providers/ApiProvider.tsx`.
- Allowed edits: `frontend/src/hooks/`, `frontend/src/lib/`, `frontend/src/providers/`, consuming components as needed.
- Coordinates with: `backend-api-agent`, `frontend-product-agent`.
- Verify: Frontend build/lint plus targeted manual API-path check when possible.
- Return: Data contract assumptions, cache invalidation notes, mock data removed or retained.

### web3-contracts-agent
- Purpose: Solidity contracts, Hardhat tests, ABI export, deployment assumptions, and contract event behavior.
- Read first: `contracts/`, `hardhat.config.ts`, `scripts/deploy.ts`, `test/`.
- Allowed edits: `contracts/`, `scripts/`, `test/`, generated ABI files only through compile.
- Coordinates with: `frontend-data-agent`, `backend-api-agent`, `marketplace-agent`.
- Verify: `npx hardhat compile` and `npx hardhat test`.
- Return: Contract behavior, ABI impact, deployment/config changes.

### wallet-auth-agent
- Purpose: Supabase session handling, SIWE wallet linking, authorization boundaries, and wallet ownership rules.
- Read first: `frontend/src/providers/SupabaseAuthProvider.tsx`, `frontend/src/providers/WalletProvider.tsx`, `backend/app/auth/`, `backend/app/api/routes_wallets.py`.
- Allowed edits: Auth providers, wallet hooks/components, backend auth/wallet routes, focused auth tests.
- Coordinates with: `backend-api-agent`, `frontend-data-agent`, `kyc-compliance-agent`.
- Verify: Focused route tests or manual auth/wallet flow checks, plus frontend build when UI changes.
- Return: Session assumptions, wallet ownership rules, failure states tested.

### marketplace-agent
- Purpose: Listings, order book, open orders, sell/withdraw flows, prices, NAV, and trading state.
- Read first: `frontend/src/hooks/useRecentListings.tsx`, `frontend/src/hooks/useOrderBook.tsx`, `frontend/src/hooks/useOpenOrders.tsx`, marketplace pages/components, listing/order models.
- Allowed edits: Marketplace hooks/components/pages, backend listing/order routes/models, related tests.
- Coordinates with: `web3-contracts-agent`, `backend-api-agent`, `frontend-product-agent`.
- Verify: Build/lint, backend route tests, or documented domain-model review.
- Return: Trading model assumptions, mock data replaced or retained, contract/API dependencies.

### kyc-compliance-agent
- Purpose: Didit KYC flows, verification state, webhook safety, and blocked-action requirements.
- Read first: `backend/app/api/routes_kyc.py`, verification models, auth dependencies, any frontend KYC surfaces.
- Allowed edits: KYC routes/services/models, verification UI, focused KYC tests.
- Coordinates with: `wallet-auth-agent`, `backend-api-agent`, `ops-observability-agent`.
- Verify: Webhook signature tests, session creation tests, or documented external-service blocker.
- Return: Compliance gates, provider assumptions, failure/degraded behavior.

### ops-observability-agent
- Purpose: Docker, Compose, env boundaries, health/readiness, logging, metrics, and deployment shape.
- Read first: `Dockerfile`, `backend/ops/docker-compose.yml`, `backend/prometheus.yml`, `USER_README.md`, env docs.
- Allowed edits: Docker/Compose/ops configs, observability config, deployment docs, health/readiness code with backend coordination.
- Coordinates with: `repo-steward`, `backend-api-agent`, `qa-verification-agent`.
- Verify: Docker Compose command when practical, config validation, health endpoint checks.
- Return: Runtime impact, env changes, rollback notes.

### qa-verification-agent
- Purpose: Review-only verification, regression hunting, test-gap reporting, and release confidence.
- Read first: Task diff, `AGENTS.md`, `AGENT_TODO.md`, relevant source/tests.
- Allowed edits: None by default. May add tests only when explicitly assigned.
- Coordinates with: Any implementing role.
- Verify: Runs agreed commands and inspects outputs.
- Return: Findings first, then command evidence, residual risks.

## Micro-Agent Patterns
- `mock-scout`: locate mock data, classify what backend/API/contract source should replace it.
- `route-test-writer`: add focused tests for one backend route module.
- `migration-auditor`: compare models, migrations, metadata imports, and clean-upgrade assumptions.
- `hook-migrator`: move one frontend hook from mock/static data to live API data.
- `contract-test-writer`: add or replace tests for one Solidity contract behavior.
- `secret-log-auditor`: scan logs and debug output for tokens, JWT payloads, keys, and signatures.
- `error-state-polisher`: add loading, empty, partial-error, and retry states to one UI surface.

## Composition Recipes
- Portfolio live-data work: `backend-api-agent` + `frontend-data-agent` + `frontend-product-agent` + `qa-verification-agent`.
- Fractionalization work: `web3-contracts-agent` + `backend-api-agent` + `frontend-data-agent` + `qa-verification-agent`.
- Wallet auth work: `wallet-auth-agent` + `backend-api-agent` + `frontend-data-agent`.
- Marketplace/trading work: `marketplace-agent` + `web3-contracts-agent` + `backend-api-agent` + `frontend-product-agent`.
- Production hardening: `ops-observability-agent` + `backend-api-agent` + `repo-steward` + `qa-verification-agent`.
- Documentation cleanup: `repo-steward` + relevant domain role + `qa-verification-agent`.
