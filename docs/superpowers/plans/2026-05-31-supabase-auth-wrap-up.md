# Supabase Auth Wrap-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fully deprecate Auth0, complete Supabase Auth session UX, and expose app-owned roles and capabilities through `/api/me`.

**Architecture:** Supabase Auth remains the only identity/session provider. The browser keeps refresh tokens inside `supabase-js`; FastAPI accepts only Supabase access-token JWTs and computes product authorization from local database state. Durable roles live in `roles`/`user_roles`; wallet and KYC state become derived capabilities.

**Tech Stack:** FastAPI, async SQLAlchemy, python-jose, pytest, React 19, Vite, TypeScript, MUI, Supabase JS v2.

---

## File Structure

- Create: `backend/tests/test_auth_deps.py` for Supabase JWT/current-user tests.
- Create: `backend/tests/test_auth0_deprecation.py` for active-route and helper removal tests.
- Create: `backend/tests/test_authorization_summary.py` for pure `/api/me` summary tests.
- Create: `backend/tests/test_kyc_state.py` for Didit state mapping tests.
- Create: `backend/tests/test_wallet_routes.py` for wallet unlink async behavior.
- Create: `backend/app/auth/authorization.py` for role, wallet, verification, and capability summary builders.
- Create: `backend/app/crud/roles.py` for local role assignment by slug.
- Create: `frontend/src/components/auth/AuthCallback.tsx` for OAuth and email confirmation redirect handling.
- Modify: `backend/requirements.txt` to include backend test dependencies.
- Modify: `backend/app/auth/deps.py` to remove Auth0 refresh exchange and use Supabase-named JWT algorithms.
- Modify: `backend/app/core/config.py` to remove Auth0 settings from active config after KYC no longer imports Auth0 helpers.
- Modify: `backend/app/main.py` to stop mounting Auth0 token helper routes.
- Modify: `backend/app/api/routes_auth.py` to return the expanded auth summary.
- Modify: `backend/app/api/routes_kyc.py` to update local verification/role state only.
- Modify: `backend/app/api/routes_wallets.py` to remove Auth0 env fallback, sanitize SIWE logs, and await wallet unlink.
- Modify: `frontend/src/providers/SupabaseAuthProvider.tsx` to return signup confirmation state and use `/auth/callback` redirects.
- Modify: `frontend/src/components/Login.tsx` to show check-email and auth error states.
- Modify: `frontend/src/App.tsx` to add the public `/auth/callback` route.
- Modify: `frontend/src/types.tsx` to match the expanded `/api/me` response.
- Modify: `USER_README.md` and `README.md` to describe Supabase-only auth and remove active Auth0 guidance.
- Delete: `backend/app/api/routes_token.py`, `backend/app/api/routes_test_tokens.py`, and `backend/app/services/auth0_mgmt.py` after imports are removed.

---

### Task 1: Backend Test Harness And Supabase JWT Tests

**Files:**
- Modify: `backend/requirements.txt`
- Create: `backend/tests/test_auth_deps.py`

- [ ] **Step 1: Add backend test dependencies**

Append these lines to `backend/requirements.txt`:

```txt
pytest
pytest-asyncio
```

- [ ] **Step 2: Write the Supabase auth tests**

Create `backend/tests/test_auth_deps.py`:

```python
from datetime import datetime, timedelta

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt

from app.auth import deps
from app.models.user import User


class FakeSession:
    def __init__(self):
        self.commits = 0
        self.inserted = None
        self.updated = None
        self.user = None

    async def execute(self, statement):
        visit_name = getattr(statement, "__visit_name__", "")
        if visit_name == "select":
            return FakeResult(self.user)
        if visit_name == "insert":
            self.inserted = dict(statement.compile().params)
            self.user = User(
                id=self.inserted["id"],
                email=self.inserted["email"],
                name=self.inserted["name"],
                picture=self.inserted["picture"],
                created_at=self.inserted["created_at"],
                last_login=self.inserted["last_login"],
            )
            return FakeResult(None)
        if visit_name == "update":
            self.updated = dict(statement.compile().params)
            return FakeResult(None)
        raise AssertionError(f"Unexpected statement: {statement}")

    def add(self, value):
        raise AssertionError("get_current_user should use explicit insert/update statements")

    async def commit(self):
        self.commits += 1


class FakeResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value

    def scalar_one(self):
        return self.value


@pytest.fixture(autouse=True)
def supabase_secret_settings(monkeypatch):
    monkeypatch.setattr(deps.settings, "supabase_jwt_secret", "unit-secret")
    monkeypatch.setattr(deps.settings, "supabase_jwt_audience", "authenticated")
    monkeypatch.setattr(deps.settings, "supabase_jwt_issuer", None)


def make_token(claims: dict) -> str:
    base_claims = {
        "aud": "authenticated",
        "exp": datetime.utcnow() + timedelta(minutes=5),
        "iat": datetime.utcnow(),
    }
    base_claims.update(claims)
    return jwt.encode(base_claims, "unit-secret", algorithm="HS256")


@pytest.mark.asyncio
async def test_get_current_user_upserts_local_user_from_supabase_claims():
    token = make_token(
        {
            "sub": "user-123",
            "email": "artist@example.com",
            "user_metadata": {
                "name": "Blue Artist",
                "picture": "https://example.com/avatar.png",
            },
        }
    )
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    db = FakeSession()

    user = await deps.get_current_user(creds=creds, db=db)

    assert user.id == "user-123"
    assert user.email == "artist@example.com"
    assert user.name == "Blue Artist"
    assert user.picture == "https://example.com/avatar.png"
    assert db.commits == 1
    assert db.inserted["id"] == "user-123"


@pytest.mark.asyncio
async def test_get_current_user_rejects_missing_subject_claim():
    token = make_token({"email": "artist@example.com"})
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    with pytest.raises(HTTPException) as exc:
        await deps.get_current_user(creds=creds, db=FakeSession())

    assert exc.value.status_code == 401
```

- [ ] **Step 3: Make missing subject validation explicit**

In `backend/app/auth/deps.py`, replace:

```python
sub = payload["sub"]
```

with:

```python
sub = payload.get("sub")
if not sub:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid token subject",
    )
```

- [ ] **Step 4: Run tests to establish the baseline**

Run: `cd backend; python -m pytest tests/test_auth_deps.py -q`

Expected: tests pass after dependencies are installed. If pytest is not installed in the active environment, run `cd backend; python -m pip install -r requirements.txt`, then rerun the test command.

- [ ] **Step 5: Commit**

```bash
git add backend/requirements.txt backend/app/auth/deps.py backend/tests/test_auth_deps.py
git commit -m "test: add supabase auth dependency coverage"
```

---

### Task 2: Remove Auth0 Refresh And Dev Token Routes

**Files:**
- Create: `backend/tests/test_auth0_deprecation.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/auth/deps.py`
- Delete: `backend/app/api/routes_token.py`
- Delete: `backend/app/api/routes_test_tokens.py`

- [ ] **Step 1: Write failing deprecation tests**

Create `backend/tests/test_auth0_deprecation.py`:

```python
from pathlib import Path

from app.main import app
from app.auth import deps


def test_auth0_refresh_routes_are_not_mounted():
    paths = {
        getattr(route, "path", "")
        for route in app.routes
    }

    assert "/api/token/refresh" not in paths
    assert "/api/test-tokens/refresh-and-validate" not in paths


def test_auth0_refresh_helper_is_removed_from_auth_deps():
    assert not hasattr(deps, "exchange_refresh_token")


def test_auth0_token_route_files_are_removed():
    assert not Path("app/api/routes_token.py").exists()
    assert not Path("app/api/routes_test_tokens.py").exists()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend; python -m pytest tests/test_auth0_deprecation.py -q`

Expected: FAIL because the routes, helper, settings, or service still exist.

- [ ] **Step 3: Stop mounting the token routes**

In `backend/app/main.py`, remove these imports:

```python
from app.api.routes_token import router as token_router
from app.api.routes_test_tokens import router as test_token_router
```

Remove these include calls:

```python
api_router.include_router(token_router)
if settings.env_type == "dev":
    api_router.include_router(test_token_router)
```

- [ ] **Step 4: Remove Auth0 refresh exchange from auth deps**

In `backend/app/auth/deps.py`, delete the `exchange_refresh_token` function. Keep the `httpx` import because JWKS loading still uses it.

Also replace the legacy `settings.algorithms` reference with Supabase-named algorithms while keeping the existing issuer logic:

```python
decode_kwargs = {
    "algorithms": settings.supabase_jwt_algorithms,
    "audience": settings.supabase_jwt_audience,
}
```

- [ ] **Step 5: Rename JWT algorithm config away from the legacy Auth0 name**

In `backend/app/core/config.py`, keep the legacy Auth0 fields until Task 4 removes the final KYC Auth0 import, but replace `algorithms` with:

```python
supabase_jwt_algorithms: List[str] = ["RS256", "ES256"]
```

Task 4 removes the legacy Auth0 fields after `auth0_mgmt.py` is no longer imported.

- [ ] **Step 6: Delete obsolete files**

Delete:

```text
backend/app/api/routes_token.py
backend/app/api/routes_test_tokens.py
```

- [ ] **Step 7: Run tests and source search**

Run: `cd backend; python -m pytest tests/test_auth0_deprecation.py -q`

Expected: PASS.

Run: `rg "exchange_refresh_token|routes_token|routes_test_tokens|test-tokens|token/refresh" backend/app --glob "!backend/venv/**"`

Expected: no active backend app matches.

- [ ] **Step 8: Commit**

```bash
git add backend/app/main.py backend/app/auth/deps.py backend/app/core/config.py backend/tests/test_auth0_deprecation.py
git add -u backend/app/api/routes_token.py backend/app/api/routes_test_tokens.py
git commit -m "refactor: remove auth0 token refresh paths"
```

---

### Task 3: Add App Authorization Summary For `/api/me`

**Files:**
- Create: `backend/app/auth/authorization.py`
- Create: `backend/tests/test_authorization_summary.py`
- Modify: `backend/app/api/routes_auth.py`
- Modify: `frontend/src/types.tsx`

- [ ] **Step 1: Write failing summary tests**

Create `backend/tests/test_authorization_summary.py`:

```python
from datetime import datetime
from types import SimpleNamespace

from app.auth.authorization import build_current_user_summary


def role(slug: str):
    return SimpleNamespace(slug=slug)


def wallet(address: str):
    return SimpleNamespace(address=address)


def test_summary_derives_roles_wallets_verification_and_capabilities():
    verified_at = datetime(2026, 5, 31, 12, 0, 0)
    user = SimpleNamespace(
        id="user-123",
        email="artist@example.com",
        name="Blue Artist",
        picture="https://example.com/avatar.png",
        created_at=datetime(2026, 5, 30, 12, 0, 0),
        last_login=None,
        roles=[role("member"), role("creator")],
        wallets=[wallet("0xabc")],
        verification=SimpleNamespace(
            id_verified_at=verified_at,
            aml_status="clear",
        ),
    )

    summary = build_current_user_summary(user)

    assert summary["roles"] == ["creator", "member"]
    assert summary["wallets"] == {
        "linked_count": 1,
        "has_linked_wallet": True,
    }
    assert summary["verification"] == {
        "kyc_status": "clear",
        "id_verified_at": verified_at.isoformat(),
    }
    assert summary["capabilities"] == {
        "can_transact": True,
        "can_create_asset": True,
        "can_fractionalize": True,
    }


def test_summary_does_not_grant_state_capabilities_from_member_wallet_role():
    user = SimpleNamespace(
        id="user-123",
        email="artist@example.com",
        name=None,
        picture=None,
        created_at=None,
        last_login=None,
        roles=[role("member_wallet")],
        wallets=[],
        verification=None,
    )

    summary = build_current_user_summary(user)

    assert summary["roles"] == ["member_wallet"]
    assert summary["wallets"]["has_linked_wallet"] is False
    assert summary["capabilities"] == {
        "can_transact": False,
        "can_create_asset": False,
        "can_fractionalize": False,
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend; python -m pytest tests/test_authorization_summary.py -q`

Expected: FAIL because `app.auth.authorization` does not exist.

- [ ] **Step 3: Implement the summary builder**

Create `backend/app/auth/authorization.py`:

```python
from datetime import datetime
from typing import Any


def _iso(value: Any) -> str | None:
    if isinstance(value, datetime):
        return value.isoformat()
    if value is None:
        return None
    return str(value)


def _role_slugs(user: Any) -> list[str]:
    roles = getattr(user, "roles", None) or []
    return sorted(
        role.slug
        for role in roles
        if getattr(role, "slug", None)
    )


def build_current_user_summary(user: Any) -> dict[str, Any]:
    roles = _role_slugs(user)
    wallets = list(getattr(user, "wallets", None) or [])
    verification = getattr(user, "verification", None)

    linked_count = len(wallets)
    has_linked_wallet = linked_count > 0
    kyc_status = getattr(verification, "aml_status", None) or "not_started"
    id_verified_at = getattr(verification, "id_verified_at", None)
    is_kyc_verified = bool(id_verified_at and kyc_status == "clear")
    is_creator = "creator" in roles

    return {
        "user_id": getattr(user, "id", None),
        "email": getattr(user, "email", None),
        "name": getattr(user, "name", None),
        "picture": getattr(user, "picture", None),
        "roles": roles,
        "verification": {
            "kyc_status": kyc_status,
            "id_verified_at": _iso(id_verified_at),
        },
        "wallets": {
            "linked_count": linked_count,
            "has_linked_wallet": has_linked_wallet,
        },
        "capabilities": {
            "can_transact": has_linked_wallet and is_kyc_verified,
            "can_create_asset": has_linked_wallet and is_creator,
            "can_fractionalize": has_linked_wallet and is_creator and is_kyc_verified,
        },
        "created_at": _iso(getattr(user, "created_at", None)),
        "last_login": _iso(getattr(user, "last_login", None)),
    }
```

- [ ] **Step 4: Expand `/api/me` with eager-loaded authorization state**

Replace `backend/app/api/routes_auth.py` with:

```python
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.authorization import build_current_user_summary
from app.auth.deps import get_current_user, get_db
from app.models import User


router = APIRouter()


@router.get("/me", response_model=dict, tags=["Auth"])
async def get_user_info(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.roles),
            selectinload(User.wallets),
            selectinload(User.verification),
        )
        .where(User.id == user.id)
    )
    full_user = result.scalar_one_or_none() or user
    return build_current_user_summary(full_user)
```

- [ ] **Step 5: Update frontend profile types**

Replace `UserProfile` in `frontend/src/types.tsx` with:

```ts
export type UserProfile = {
  user_id: string;
  name: string | null;
  email: string | null;
  picture: string | null;
  roles: string[];
  verification: {
    kyc_status: string;
    id_verified_at: string | null;
  };
  wallets: {
    linked_count: number;
    has_linked_wallet: boolean;
  };
  capabilities: {
    can_transact: boolean;
    can_create_asset: boolean;
    can_fractionalize: boolean;
  };
  created_at: string | null;
  last_login: string | null;
};
```

Keep the existing `WalletCreate` export below it.

- [ ] **Step 6: Run backend tests**

Run: `cd backend; python -m pytest tests/test_authorization_summary.py -q`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/app/auth/authorization.py backend/app/api/routes_auth.py backend/tests/test_authorization_summary.py frontend/src/types.tsx
git commit -m "feat: expose auth roles and capabilities"
```

---

### Task 4: Replace Auth0 KYC Promotion With Local Verification And Role State

**Files:**
- Create: `backend/app/crud/roles.py`
- Create: `backend/tests/test_kyc_state.py`
- Modify: `backend/app/core/config.py`
- Modify: `backend/app/api/routes_kyc.py`
- Delete: `backend/app/services/auth0_mgmt.py`

- [ ] **Step 1: Write failing KYC state tests**

Create `backend/tests/test_kyc_state.py`:

```python
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace

from app.api.routes_kyc import apply_didit_session_update
from app.core.config import Settings


def test_apply_didit_session_update_keeps_user_id_and_stores_didit_session():
    row = SimpleNamespace(
        user_id="user-123",
        didit_session_id=None,
        aml_status="pending",
        aml_score=None,
        id_verified_at=None,
        aml_checked_at=None,
    )
    now = datetime(2026, 5, 31, 12, 0, 0)
    session = {
        "session_id": "didit-session-456",
        "decision": "approved",
        "aml": {"risk_score": 12},
    }

    apply_didit_session_update(row, session, now=now)

    assert row.user_id == "user-123"
    assert row.didit_session_id == "didit-session-456"
    assert row.aml_status == "clear"
    assert row.aml_score == 12
    assert row.id_verified_at == now
    assert row.aml_checked_at == now


def test_apply_didit_session_update_rejects_high_aml_score():
    row = SimpleNamespace(
        user_id="user-123",
        didit_session_id=None,
        aml_status="pending",
        aml_score=None,
        id_verified_at=None,
        aml_checked_at=None,
    )
    now = datetime(2026, 5, 31, 12, 0, 0)
    session = {
        "session_id": "didit-session-789",
        "decision": "approved",
        "aml": {"risk_score": 70},
    }

    apply_didit_session_update(row, session, now=now)

    assert row.didit_session_id == "didit-session-789"
    assert row.aml_status == "reject"
    assert row.aml_score == 70
    assert row.id_verified_at is None
    assert row.aml_checked_at == now


def test_auth0_settings_are_removed_from_active_config():
    fields = set(Settings.model_fields)

    assert "auth0_domain" not in fields
    assert "auth0_client_id" not in fields
    assert "auth0_client_secret" not in fields
    assert "auth0_m2m_client_id" not in fields
    assert "auth0_m2m_client_secret" not in fields
    assert "auth0_sync_hmac" not in fields


def test_auth0_service_file_is_removed():
    assert not Path("app/services/auth0_mgmt.py").exists()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend; python -m pytest tests/test_kyc_state.py -q`

Expected: FAIL because `apply_didit_session_update` does not exist.

- [ ] **Step 3: Add local role assignment helper**

Create `backend/app/crud/roles.py`:

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Role, UserRole


async def assign_role_slug(db: AsyncSession, user_id: str, slug: str) -> None:
    result = await db.execute(select(Role).where(Role.slug == slug))
    role = result.scalar_one_or_none()
    if role is None:
        role = Role(slug=slug, description=f"{slug} role")
        db.add(role)
        await db.flush()

    existing = await db.get(
        UserRole,
        {"user_id": user_id, "role_id": role.id},
    )
    if existing is None:
        db.add(UserRole(user_id=user_id, role_id=role.id))
```

- [ ] **Step 4: Update KYC route**

In `backend/app/api/routes_kyc.py`:

Remove:

```python
from uuid import UUID
from app.services.auth0_mgmt import add_role_to_user
```

Add:

```python
from app.crud.roles import assign_role_slug
```

Add this helper near the router setup:

```python
def apply_didit_session_update(row: UserVerification, session: dict, now: datetime | None = None) -> None:
    now = now or datetime.utcnow()
    decision = session["decision"]
    aml_score = int(session["aml"]["risk_score"])

    row.didit_session_id = session["session_id"]
    row.aml_score = aml_score
    row.aml_status = "clear" if decision == "approved" and aml_score < 60 else "reject"
    row.id_verified_at = now if row.aml_status == "clear" else None
    row.aml_checked_at = now
```

Update the webhook body to use string user ids and local roles:

```python
payload = json.loads(raw)
session = payload["session"]
user_id = str(session["metadata"]["user_id"])

log.info(
    "Didit webhook received for user %s session %s",
    user_id,
    session["session_id"],
)

row = await db.get(UserVerification, user_id)
if not row:
    raise HTTPException(404, "User verification row missing")

apply_didit_session_update(row, session)

if row.aml_status == "clear":
    await assign_role_slug(db, user_id, "member")

await db.commit()
return {"ok": True}
```

- [ ] **Step 5: Remove Auth0 settings and service file**

In `backend/app/core/config.py`, delete the legacy Auth0 settings block:

```python
secret_key: str | None = None
auth0_domain: str | None = None
auth0_audience: str | None = None
auth0_client_id: str | None = None
auth0_client_secret: str | None = None
auth0_m2m_client_id: str | None = None
auth0_m2m_client_secret: str | None = None
auth0_sync_hmac: str | None = None
auth0_token_url: str = ""
auth0_siwe_connection: str = "siwe"
auth0_allowed_chains: List[int] = [11155111, 1]
```

Delete:

```text
backend/app/services/auth0_mgmt.py
```

Keep `public_base_url` only if another non-Auth0 service imports it. The `.env` loader has `extra = "allow"`, so old local Auth0 env vars will be ignored instead of breaking startup.

- [ ] **Step 6: Run KYC tests and Auth0 search**

Run: `cd backend; python -m pytest tests/test_kyc_state.py -q`

Expected: PASS.

Run: `rg "auth0|AUTH0|add_role_to_user" backend/app --glob "!backend/venv/**"`

Expected: no active backend app matches.

- [ ] **Step 7: Commit**

```bash
git add backend/app/api/routes_kyc.py backend/app/core/config.py backend/app/crud/roles.py backend/tests/test_kyc_state.py
git add -u backend/app/services/auth0_mgmt.py
git commit -m "refactor: store kyc promotion locally"
```

---

### Task 5: Fix Wallet Unlink And Sanitize SIWE Route Logging

**Files:**
- Create: `backend/tests/test_wallet_routes.py`
- Modify: `backend/app/api/routes_wallets.py`

- [ ] **Step 1: Write failing wallet unlink test**

Create `backend/tests/test_wallet_routes.py`:

```python
import pytest

from app.api import routes_wallets


@pytest.mark.asyncio
async def test_unlink_wallet_awaits_async_crud_call(monkeypatch):
    calls = []

    async def fake_remove_wallet(db, user_id, address):
        calls.append((db, user_id, address))

    monkeypatch.setattr(routes_wallets.crud, "remove_wallet", fake_remove_wallet)

    db = object()
    user = type("User", (), {"id": "user-123"})()
    await routes_wallets.unlink_wallet("0xABC", db=db, user=user)

    assert calls == [(db, "user-123", "0xABC")]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend; python -m pytest tests/test_wallet_routes.py -q`

Expected: FAIL because `crud.remove_wallet` is not awaited.

- [ ] **Step 3: Update SIWE chain env parsing and logging**

In `backend/app/api/routes_wallets.py`, replace:

```python
raw_chains = os.getenv("SIWE_ALLOWED_CHAINS") or os.getenv("AUTH0_ALLOWED_CHAINS", "[1]")
```

with:

```python
raw_chains = os.getenv("SIWE_ALLOWED_CHAINS", "[1]")
```

Remove the `print(...)` calls inside `verify_siwe`. Keep structured logs that do not include full raw SIWE messages, signatures, or bearer tokens:

```python
logger.debug("verify_siwe domain=%s expected_nonce_present=%s", expected_domain, bool(expected_nonce))
```

- [ ] **Step 4: Await wallet removal and fix async type hints**

Replace the unlink route with:

```python
@router.delete("/{address}", status_code=status.HTTP_204_NO_CONTENT)
async def unlink_wallet(
    address: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    try:
        await crud.remove_wallet(db, user.id, address)
    except ValueError as e:
        raise HTTPException(404, str(e))
```

- [ ] **Step 5: Run wallet tests and source search**

Run: `cd backend; python -m pytest tests/test_wallet_routes.py -q`

Expected: PASS.

Run: `rg "AUTH0_ALLOWED_CHAINS|Raw SIWE message|print\\(" backend/app/api/routes_wallets.py`

Expected: no matches.

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/routes_wallets.py backend/tests/test_wallet_routes.py
git commit -m "fix: await wallet unlink and sanitize siwe logs"
```

---

### Task 6: Add Email Confirmation And Google OAuth Callback UX

**Files:**
- Create: `frontend/src/components/auth/AuthCallback.tsx`
- Modify: `frontend/src/providers/SupabaseAuthProvider.tsx`
- Modify: `frontend/src/components/Login.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Update auth provider contract**

In `frontend/src/providers/SupabaseAuthProvider.tsx`, add:

```ts
type SignUpResult = {
  needsEmailConfirmation: boolean;
};
```

Change the context type:

```ts
signUpWithPassword: (email: string, password: string) => Promise<SignUpResult>;
```

Replace `signUpWithPassword` with:

```ts
const signUpWithPassword = useCallback(async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
  return { needsEmailConfirmation: !data.session };
}, []);
```

Replace the Google redirect target:

```ts
const signInWithGoogle = useCallback(async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) throw error;
}, []);
```

- [ ] **Step 2: Add callback component**

Create `frontend/src/components/auth/AuthCallback.tsx`:

```tsx
import { AppProvider } from "@toolpad/core/AppProvider";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import darkTheme from "../../css-styles/darkTheme";
import { useSupabaseAuth } from "../../providers/SupabaseAuthProvider";

function readAuthError(): string {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);
  return (
    hashParams.get("error_description") ||
    searchParams.get("error_description") ||
    ""
  );
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useSupabaseAuth();
  const initialError = useMemo(readAuthError, []);
  const [error] = useState(initialError);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !error) {
      navigate("/dashboard", { replace: true });
    }
  }, [error, isAuthenticated, isLoading, navigate]);

  return (
    <AppProvider theme={darkTheme}>
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          backgroundColor: darkTheme.palette.background.default,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 2,
        }}
      >
        <Stack spacing={2} alignItems="center">
          {error ? (
            <>
              <Typography variant="h5" color="white" fontWeight={700}>
                Sign-in link failed
              </Typography>
              <Typography variant="body2" color="error" textAlign="center">
                {error}
              </Typography>
            </>
          ) : (
            <>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary">
                Finishing sign in...
              </Typography>
            </>
          )}
        </Stack>
      </Box>
    </AppProvider>
  );
}
```

- [ ] **Step 3: Add route**

In `frontend/src/App.tsx`, import:

```ts
import AuthCallback from "./components/auth/AuthCallback";
```

Add a public route near `/`:

```tsx
<Route path="/auth/callback" element={<AuthCallback />} />
```

- [ ] **Step 4: Update login/signup UI**

In `frontend/src/components/Login.tsx`, add state:

```ts
const [notice, setNotice] = useState("");
```

At the start of `submit`, clear it:

```ts
setNotice("");
```

Replace the signup branch inside `submit`:

```ts
if (mode === "signin") {
  await signInWithPassword(email, password);
  navigate("/dashboard");
} else {
  const result = await signUpWithPassword(email, password);
  if (result.needsEmailConfirmation) {
    setNotice("Check your email to confirm your account before signing in.");
    return;
  }
  navigate("/dashboard");
}
```

Render the notice below the error block:

```tsx
{notice && (
  <Typography variant="body2" color="success.main">
    {notice}
  </Typography>
)}
```

Wrap the Google call with error handling:

```tsx
onClick={async () => {
  setPending(true);
  setError("");
  setNotice("");
  try {
    await signInWithGoogle();
  } catch (err) {
    setError(err instanceof Error ? err.message : "Google sign-in failed");
    setPending(false);
  }
}}
```

- [ ] **Step 5: Run frontend build**

Run: `cd frontend; npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/providers/SupabaseAuthProvider.tsx frontend/src/components/Login.tsx frontend/src/components/auth/AuthCallback.tsx frontend/src/App.tsx
git commit -m "feat: add supabase oauth callback and email confirmation UX"
```

---

### Task 7: Update Auth Documentation

**Files:**
- Modify: `USER_README.md`
- Modify: `README.md`
- Modify: `AGENT_TODO.md`

- [ ] **Step 1: Update USER_README auth route notes**

In `USER_README.md`, replace the rows for `/token/refresh` and `/test-tokens/refresh-and-validate` with:

```md
| `GET /me` | `routes_auth.py` | Supabase-authenticated app profile with roles, wallet state, KYC state, and derived capabilities. |
```

Add this note near the auth section:

```md
Supabase is the only active identity provider. The frontend keeps Supabase refresh tokens inside `supabase-js`; the backend accepts only bearer access tokens and validates them as Supabase JWTs. There is no backend refresh-token exchange endpoint.
```

- [ ] **Step 2: Update README top-level auth references**

In `README.md`, replace top-level Auth0 provider references with Supabase Auth. At minimum, the technology table should read:

```md
| **Auth**       | [Supabase Auth](https://supabase.com/docs/guides/auth) | Email/password, Google OAuth, JWT sessions |
```

Add this note before any older historical auth walkthrough that remains:

```md
> Active auth architecture: The app now uses Supabase Auth. Any older Auth0 notes below are historical and should not be used for new work.
```

- [ ] **Step 3: Update AGENT_TODO auth workstream**

In `AGENT_TODO.md`, move these items from Next to Completed after implementation and verification:

```md
- [x] Fully deprecated Auth0 from active backend routes, refresh flows, and role promotion paths.
- [x] Added `/api/me` roles, wallet state, KYC state, and derived capabilities.
- [x] Added Google auth callback/error handling and documented Supabase/Google Console redirect settings.
- [x] Added email verification signup UX.
```

- [ ] **Step 4: Run documentation/source search**

Run: `rg "auth0|Auth0|AUTH0|token/refresh|test-tokens" backend/app frontend/src USER_README.md README.md AGENT_TODO.md --glob "!backend/venv/**"`

Expected: any remaining matches are clearly marked historical documentation, not active code paths.

- [ ] **Step 5: Commit**

```bash
git add USER_README.md README.md AGENT_TODO.md
git commit -m "docs: document supabase-only auth architecture"
```

---

### Task 8: Full Verification

**Files:**
- Review all files changed in Tasks 1-7.

- [ ] **Step 1: Run backend auth test suite**

Run: `cd backend; python -m pytest tests/test_auth_deps.py tests/test_auth0_deprecation.py tests/test_authorization_summary.py tests/test_kyc_state.py tests/test_wallet_routes.py -q`

Expected: PASS.

- [ ] **Step 2: Run backend import smoke check**

Run: `cd backend; python -c "from app.main import app; print(app.title)"`

Expected output includes:

```text
Blue-Maroon API
```

- [ ] **Step 3: Run frontend build**

Run: `cd frontend; npm run build`

Expected: PASS.

- [ ] **Step 4: Run frontend lint**

Run: `cd frontend; npm run lint`

Expected: PASS or documented pre-existing lint failures unrelated to this auth work.

- [ ] **Step 5: Verify source boundary**

Run: `rg "auth0|Auth0|AUTH0|refresh_token|token/refresh|test-tokens" backend/app frontend/src --glob "!backend/venv/**"`

Expected: no matches in active application code.

- [ ] **Step 6: Record review summary**

Create `docs/superpowers/reviews/2026-05-31-supabase-auth-wrap-up-verification.md` with:

```md
# Supabase Auth Wrap-Up Verification

Date: 2026-05-31

## Commands

- `cd backend; python -m pytest tests/test_auth_deps.py tests/test_auth0_deprecation.py tests/test_authorization_summary.py tests/test_kyc_state.py tests/test_wallet_routes.py -q`
- `cd backend; python -c "from app.main import app; print(app.title)"`
- `cd frontend; npm run build`
- `cd frontend; npm run lint`
- `rg "auth0|Auth0|AUTH0|refresh_token|token/refresh|test-tokens" backend/app frontend/src --glob "!backend/venv/**"`

## Results

- Backend auth tests: record the exact pytest pass/fail line.
- Backend import smoke: record the printed FastAPI title.
- Frontend build: record the final build status line.
- Frontend lint: record the lint pass/fail line and any pre-existing unrelated failure.
- Active code Auth0 search: record whether the command returned no active-code matches.

## Remaining Risks

- Supabase dashboard settings for Confirm Email, Google provider, Site URL, and redirect URLs must be checked outside the repo.
- Provider tokens for Google APIs are intentionally not stored by this implementation.
- Strict session revocation by checking Supabase `session_id` against `auth.sessions` is reserved for a later sensitive-action hardening pass.
```

- [ ] **Step 7: Final commit**

```bash
git add docs/superpowers/reviews/2026-05-31-supabase-auth-wrap-up-verification.md
git commit -m "docs: record auth wrap-up verification"
```

---

## Execution Notes

- Use the `wallet-auth-agent` as the lead role.
- Coordinate with `backend-api-agent` for FastAPI route changes.
- Coordinate with `kyc-compliance-agent` for Didit webhook changes.
- Coordinate with `frontend-data-agent` for Supabase provider and profile type changes.
- Coordinate with `repo-steward` for README and local task-board updates.
- Do not print `.env` contents or token values while verifying.
