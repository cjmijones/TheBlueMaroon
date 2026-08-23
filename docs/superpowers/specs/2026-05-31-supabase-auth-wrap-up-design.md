# Supabase Auth Wrap-Up Design

Status: proposed for implementation after review

## Summary

TheBlueMaroon should complete the migration to Supabase Auth by making Supabase the only identity/session provider and moving product authorization into the app database. Auth0 refresh-token and role-management paths should be fully deprecated.

The frontend should let `supabase-js` own browser session persistence and refresh. The backend should validate only Supabase access-token JWTs, derive the local app user from the `sub` claim, and never accept refresh tokens from the client.

## Current Sources

- Supabase session docs: https://supabase.com/docs/guides/auth/sessions
- Supabase JWT docs: https://supabase.com/docs/guides/auth/jwts
- Supabase Google login docs: https://supabase.com/docs/guides/auth/social-login/auth-google
- Supabase user data docs: https://supabase.com/docs/guides/auth/managing-user-data
- Local frontend auth client: `frontend/src/lib/supabase.ts`
- Local frontend auth provider: `frontend/src/providers/SupabaseAuthProvider.tsx`
- Local backend auth dependency: `backend/app/auth/deps.py`
- Local backend token routes: `backend/app/api/routes_token.py`, `backend/app/api/routes_test_tokens.py`
- Local KYC route: `backend/app/api/routes_kyc.py`
- Local wallet route: `backend/app/api/routes_wallets.py`

## Goals

- Fully deprecate Auth0 from the active app path.
- Keep refresh tokens out of backend request bodies, logs, and app APIs.
- Make backend auth validation Supabase-first through JWKS/asymmetric JWT verification.
- Improve signup and Google login UX around redirects, errors, and email confirmation.
- Clarify how local users are tracked and how authorization is calculated.
- Begin a roles/capabilities model that does not confuse wallet state or KYC state with durable roles.
- Fix auth-adjacent correctness issues found during the audit.

## Non-Goals

- Do not introduce a second identity provider.
- Do not store Google provider tokens unless a future feature needs Google APIs beyond login.
- Do not move all product authorization into Supabase JWT custom claims in this pass.
- Do not redesign every frontend auth screen beyond the signup, Google, and profile/capability flows needed for this work.

## Design Decisions

### Identity And Session Model

Supabase Auth is the identity source. The frontend continues to use `persistSession: true`, `autoRefreshToken: true`, and `detectSessionInUrl: true`.

Access tokens are sent to the FastAPI backend as `Authorization: Bearer <token>`. Refresh tokens stay inside the Supabase client session store and are not submitted to backend endpoints. This matches Supabase's session model: access tokens are short-lived JWTs, refresh tokens are single-use session refresh credentials, and `supabase-js` manages refresh for browser apps.

The backend verifies Supabase JWTs through the project JWKS endpoint. Shared-secret verification can remain only as an explicitly documented local/legacy fallback, but production guidance should prefer asymmetric signing keys and JWKS.

### Auth0 Deprecation

The implementation should remove Auth0 from the active route graph and code paths:

- Stop mounting `/api/token/refresh`.
- Stop mounting or remove `/api/test-tokens/refresh-and-validate`.
- Remove backend calls to Auth0 management for role assignment.
- Remove `AUTH0_ALLOWED_CHAINS` as a SIWE fallback.
- Remove or quarantine Auth0 config fields and helper modules after confirming no active import remains.

Any legacy endpoint kept temporarily must return `410 Gone` with a short migration message and must not accept or return tokens.

### User Tracking

The local `users` table remains the app profile table. It is keyed by the Supabase auth user id from JWT `sub`.

Backend `get_current_user` should:

- Validate the token.
- Require `sub`.
- Upsert the local user.
- Use `email`, `user_metadata.name`, and `user_metadata.picture` only for display/profile fields.
- Never use `user_metadata` for authorization decisions.

The `/api/me` response should become the app's frontend-facing auth summary. It should return local identity fields, roles, capability flags, wallet state, and verification state. It should avoid returning raw JWT claims.

### Google Login

Google sign-in should continue through Supabase OAuth. The app already has a `signInWithGoogle` method and button, but the implementation should make the redirect target explicit, add a lightweight callback/error surface, and document required Supabase and Google Console settings.

Provider tokens are not needed for login. If the app later needs to call Google APIs, provider tokens must be treated separately from Supabase session tokens and stored only in a secure server-side design.

### Email Verification

Email verification should primarily be enforced through Supabase Auth project settings. With Confirm Email enabled, unconfirmed email users should not get a normal signed-in session after signup.

The frontend should detect the signup response where no session is returned and show a check-email state instead of navigating to `/dashboard`. Redirect URLs and Site URL must be configured in Supabase so confirmation links return to the app.

If future backend actions must independently enforce email verification even when Supabase allows unconfirmed sign-in, add a trusted server-side Supabase Admin lookup. Do not trust client-submitted email verification flags.

### Roles And Capabilities

Use durable roles for product responsibilities such as `creator` or `admin`. Do not model wallet-connected or KYC-verified as roles.

Use derived capabilities for changing state:

- `has_linked_wallet`: derived from the `wallets` table.
- `is_kyc_verified`: derived from `user_verification.id_verified_at` and `aml_status == "clear"`.
- `can_transact`: true when the user is authenticated, has a linked wallet, and meets the required verification state for the transaction type.
- `can_create_asset`: true when the user has the durable `creator` role, a linked wallet, and clear KYC.
- `can_fractionalize`: true when the user has the durable `creator` role, a linked wallet, and any verification state required by the product rules.

Existing state-like roles such as `member_wallet` should be treated as legacy or transitional. The implementation can keep reading them for compatibility but should not add new state roles.

### KYC And Wallet Corrections

The KYC webhook should update `UserVerification.didit_session_id`, not overwrite `user_id`. Successful Didit approval should update local verification state and, if needed, grant a local app role through the database rather than Auth0.

Wallet unlink must await the async CRUD call. SIWE debug prints and noisy logs should be removed or reduced so signatures, raw messages, nonces, bearer tokens, and JWT payloads are not leaked into logs.

## API Shape

The intended `/api/me` response should look like:

```json
{
  "user_id": "supabase-user-id",
  "email": "user@example.com",
  "name": "Display Name",
  "picture": "https://example.com/avatar.png",
  "roles": ["member"],
  "verification": {
    "kyc_status": "clear",
    "id_verified_at": "2026-05-31T00:00:00"
  },
  "wallets": {
    "linked_count": 1,
    "has_linked_wallet": true
  },
  "capabilities": {
    "can_transact": true,
    "can_create_asset": false,
    "can_fractionalize": false
  },
  "created_at": "2026-05-31T00:00:00",
  "last_login": "2026-05-31T00:00:00"
}
```

These capability names should be used by the implementation plan unless the plan finds an existing frontend naming pattern that should be preserved.

## Testing And Verification

Implementation should add focused backend tests before changing production code:

- Supabase JWT decode/upsert happy path.
- Missing/invalid token returns unauthorized.
- Auth0 refresh endpoints are gone or return `410 Gone` without token handling.
- `/api/me` returns roles and derived capabilities.
- Wallet unlink awaits deletion and enforces ownership.
- KYC webhook writes `didit_session_id`, verification fields, and does not call Auth0.

Frontend verification should cover:

- Existing session still routes to protected app.
- Email signup with no session shows check-email state.
- Google sign-in calls Supabase OAuth with the explicit redirect URL.
- Frontend build still passes.

## Open Implementation Notes

- This repo currently has little backend test coverage. The implementation plan should include a minimal pytest scaffold if no reusable scaffold exists.
- Supabase dashboard settings cannot be committed to this repo, so the implementation should document the required Google provider, Site URL, redirect URLs, and Confirm Email settings.
- A later hardening pass can consider checking Supabase `session_id` against `auth.sessions` for especially sensitive actions.
