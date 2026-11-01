# Admin Portal V1 Implementation Plan

Date: 2026-06-07

## Objective

Add the first read-only admin portal slice: documented admin powers, backend admin authorization, user inspection endpoints, and a separate React admin app shell.

## Tasks

1. Document the admin portal design and update local agent planning references.
2. Add a backend admin authorization dependency that reloads local roles and requires `admin`.
3. Add read-only `/api/admin/me` and `/api/admin/users` endpoints with sanitized user payloads.
4. Add focused backend tests for the admin gate and admin payload shape.
5. Scaffold `admin/` as a separate Vite React app using Supabase Auth and backend admin APIs.
6. Add a Docker Compose `admin` service exposed on `5174` with `/api` proxied to the backend app service.
7. Run focused backend tests, an admin app build, and Compose config verification.

## Implementation Notes

- Keep V1 read-only so no migration is required.
- Reuse `build_current_user_summary` for capability semantics.
- Include detailed wallet and KYC fields for operator visibility.
- Add admin dev origins to backend CORS for port `5174`.
- Do not expose service-role keys, direct database URLs, or secret backend env values in the admin app.
- In Docker Compose, keep admin UI traffic on `5174` and proxy `/api` from the admin service to `app:8000`.

## Future Follow-Up

- Add audited role mutations.
- Add audited KYC review operations.
- Add admin case notes and operational audit views.
- Add MFA or session freshness requirements for privileged mutations.
- Add a documented bootstrap process for assigning the first admin user.
