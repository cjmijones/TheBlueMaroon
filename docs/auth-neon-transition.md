# Supabase Auth and Neon transition

## Target

Use Supabase Auth for sign-in and sessions, and Postgres through SQLAlchemy for application data. Use Neon for shared development and local Postgres for isolated tests. Keep the API responsible for authorization and never expose database credentials or Supabase secret keys to the browser.

Existing development identities and data do not need migration. Do not delete or overwrite existing databases as part of this transition.

## Implementation

1. Replace the Auth0 browser provider and consumers with Supabase Auth, supporting password and Google sign-in, sign-up, callback, sign-out and protected routes.
2. Replace Auth0 JWT validation with Supabase issuer, audience, expiry and signing-key validation. Remove token logging and deprecated Auth0 routes.
3. Decouple KYC and wallet behavior from Auth0, using local database roles and existing wallet proof-of-ownership checks.
4. Make database selection explicit for local and Docker environments, and ensure Alembic targets the intended database.
5. Document public configuration, OAuth redirects, transactional email, development setup and production security requirements.
6. Verify invalid and valid tokens, user creation, authorization, frontend build, backend tests, and database connection. Exercise a real sign-in only when suitable configured credentials and a reachable test environment are available.

## Release gate

This is a development configuration until authentication, identity verification, database backups, admin MFA, monitoring, and real-user sign-in and recovery flows have been verified in their intended environment.

## Current state

- Local `main` still uses Auth0. The existing Supabase implementation is on remote branch `supabase-auth-migration`; the branch also includes KYC, wallet, marketplace and admin changes.
- A read-only `SELECT 1` against the configured development Neon database succeeded on 2026-10-31. This does not verify the schema or application login flow.
- Before merging, validate on-chain receipts before fractional listings become active, and review Didit webhook replay protection against current provider documentation.
- Verify the complete branch diff and run the frontend build, backend tests, and real Supabase authentication flow against the intended development environment.
- GitHub integration returned HTTP 403 when creating the pull request; pull request write permission is required.
