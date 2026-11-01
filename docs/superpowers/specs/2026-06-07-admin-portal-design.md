# Admin Portal Design

Date: 2026-06-07

## Goal

Create a separate admin portal for authorized operators to inspect users, KYC state, wallet connections, roles, and derived application capabilities. The portal should help the team manage the user flow without exposing privileged database credentials or mixing admin-only workflows into the customer-facing React app.

## Current Decision

Use a separate React/Vite app under `admin/` and serve all privileged data through FastAPI routes under `/api/admin/*`.

The admin browser app uses the normal Supabase Auth session and only a publishable Supabase key. It never receives a Supabase service-role key, direct database URL, or bypass-RLS credential. The backend validates the bearer token, loads the local user record, and grants admin access only when the local `admin` role is present.

## V1 Scope

V1 is intentionally read-only:

- Admin login and logout through Supabase Auth.
- Backend admin gate that requires the local `admin` role.
- `/api/admin/me` for the current admin identity and capability summary.
- `/api/admin/users` for a searchable, paginated user list.
- User rows include roles, KYC status, wallet connection summary, wallet details, timestamps, and derived capabilities.
- Admin UI shell with search, status summaries, user table, and clear access-denied states.

## Non-Goals For V1

- No role mutation endpoint.
- No manual KYC approval or rejection endpoint.
- No account deletion, suspension, or wallet unlinking by admins.
- No Supabase service-role use in browser code.
- No replacement for the Supabase Dashboard or Didit provider console.

## Admin Powers Backlog

- User search and profile inspection by email, user id, name, wallet address, KYC state, and role.
- KYC operations: review provider session status, retry session creation, mark internal review notes, and identify stale sessions.
- Role operations: grant or revoke app roles such as `creator` and future admin-only permissions.
- Wallet operations: inspect wallet links, chain ids, primary wallet, conflicts, and ownership history.
- Capability view: explain why a user can or cannot transact, mint, or fractionalize.
- Case notes: internal notes, assignee, resolution status, and next action.
- Audit trail: every admin mutation records actor, target user, action, reason, metadata, and timestamp.
- Transaction and asset context: show linked creator assets, fractional drafts, transactions, and listings.
- Safety controls: session freshness checks, high-risk action confirmation, optional MFA enforcement, and least-privilege permission groups.

## Security Model

- Admin authorization is server-enforced on every `/api/admin/*` request.
- The browser only proves identity by sending a Supabase access token.
- The backend performs authorization using local roles and existing application data.
- Privileged mutations, when added, must require a reason and write an audit event.
- Authorization state stored in Supabase `app_metadata` can be useful later, but local server-side role checks remain the source of truth for backend admin routes.
- JWT claims are treated as potentially stale until refreshed, so sensitive admin decisions should load fresh state from the database.
- Admin tables and future direct Supabase Data API access must use RLS and least-privilege grants.

## Data Flow

1. Admin signs in through the separate admin app.
2. Supabase stores and refreshes the user session in the browser.
3. Admin UI requests `/api/admin/me` and `/api/admin/users` with the access token.
4. FastAPI validates the token and upserts or updates the local user record.
5. FastAPI reloads the user with local roles and rejects the request unless `admin` is present.
6. FastAPI returns sanitized user operations data.

## Docker Flow

The Docker Compose stack runs the admin portal as a separate `admin` service on host port `5174`. The admin Vite server receives browser requests at `http://localhost:5174` and proxies `/api` requests to the FastAPI `app` service at `http://app:8000` inside the Compose network.

This keeps the local Docker URL shape consistent with normal development:

- Main app and backend: `http://localhost:8000`
- Admin portal: `http://localhost:5174`
- Admin backend routes: `/api/admin/*`, proxied by the admin service to the backend

## Verification

- Focused backend tests for admin role checks and user payload serialization.
- Admin app TypeScript and Vite build.
- Future UI smoke test once the browser smoke harness is stable for the separate admin dev server.

## References

- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase securing your data: https://supabase.com/docs/guides/database/secure-data
- OWASP Authorization Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- OWASP Administrative Interfaces: https://andrewwhite.gitbooks.io/owasp/content/04-OperationalSecurity/Administrative-Interfaces.html
