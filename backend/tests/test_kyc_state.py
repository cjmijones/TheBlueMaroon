import asyncio
import hmac
import hashlib
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace

import pytest

from app.api import routes_kyc
from app.api.routes_kyc import apply_didit_session_update
from app.core.config import Settings


def make_verification_row():
    return SimpleNamespace(
        user_id="user-123",
        didit_session_id=None,
        aml_status="pending",
        aml_score=None,
        id_verified_at=None,
        aml_checked_at=None,
    )


class FakeKycDb:
    def __init__(self, row=None):
        self.row = row
        self.added = []
        self.commits = 0

    async def get(self, model, user_id):
        return self.row

    def add(self, row):
        self.added.append(row)
        self.row = row

    async def commit(self):
        self.commits += 1


def test_apply_didit_session_update_keeps_user_id_and_stores_didit_session():
    row = make_verification_row()
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
    row = make_verification_row()
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


@pytest.mark.parametrize("score", ["12", "12.0"])
def test_apply_didit_session_update_normalizes_string_integer_scores(score):
    row = make_verification_row()
    now = datetime(2026, 5, 31, 12, 0, 0)
    session = {
        "session_id": "didit-session-string-score",
        "decision": "approved",
        "aml": {"risk_score": score},
    }

    apply_didit_session_update(row, session, now=now)

    assert row.aml_status == "clear"
    assert row.aml_score == 12
    assert row.id_verified_at == now


@pytest.mark.parametrize(
    ("score", "expected_status"),
    [
        (59, "clear"),
        (60, "reject"),
    ],
)
def test_apply_didit_session_update_uses_60_as_rejection_boundary(
    score,
    expected_status,
):
    row = make_verification_row()
    now = datetime(2026, 5, 31, 12, 0, 0)
    session = {
        "session_id": "didit-session-boundary",
        "decision": "approved",
        "aml": {"risk_score": score},
    }

    apply_didit_session_update(row, session, now=now)

    assert row.aml_status == expected_status
    assert row.aml_score == score
    assert row.id_verified_at == (now if expected_status == "clear" else None)


@pytest.mark.parametrize("score", [None, "not-a-number", 12.5, "12.5", True])
def test_apply_didit_session_update_rejects_invalid_aml_scores(score):
    row = make_verification_row()
    session = {
        "session_id": "didit-session-invalid-score",
        "decision": "approved",
        "aml": {"risk_score": score},
    }

    with pytest.raises(ValueError, match="Invalid AML risk score"):
        apply_didit_session_update(row, session)

    assert row.aml_score is None


def test_sync_kyc_role_state_grants_member_when_clear(monkeypatch):
    calls = []

    async def fake_assign_role_slug(db, user_id, slug):
        calls.append(("assign", db, user_id, slug))

    async def fake_revoke_role_slug(db, user_id, slug):
        calls.append(("revoke", db, user_id, slug))

    monkeypatch.setattr(routes_kyc, "assign_role_slug", fake_assign_role_slug)
    monkeypatch.setattr(routes_kyc, "revoke_role_slug", fake_revoke_role_slug)
    db = object()

    asyncio.run(routes_kyc.sync_kyc_role_state(db, "user-123", "clear"))

    assert calls == [("assign", db, "user-123", "member")]


def test_sync_kyc_role_state_revokes_member_when_rejected(monkeypatch):
    calls = []

    async def fake_assign_role_slug(db, user_id, slug):
        calls.append(("assign", db, user_id, slug))

    async def fake_revoke_role_slug(db, user_id, slug):
        calls.append(("revoke", db, user_id, slug))

    monkeypatch.setattr(routes_kyc, "assign_role_slug", fake_assign_role_slug)
    monkeypatch.setattr(routes_kyc, "revoke_role_slug", fake_revoke_role_slug)
    db = object()

    asyncio.run(routes_kyc.sync_kyc_role_state(db, "user-123", "reject"))

    assert calls == [("revoke", db, "user-123", "member")]


def test_start_kyc_creates_missing_verification_row(monkeypatch):
    async def fake_create_verification_session(user_id, email):
        return {"session_id": "didit-session-123", "url": "https://verify.example/session"}

    monkeypatch.setattr(routes_kyc, "create_verification_session", fake_create_verification_session)
    db = FakeKycDb()
    user = SimpleNamespace(id="user-123", email="creator@example.com")

    result = asyncio.run(routes_kyc.start_kyc(db=db, user=user))

    assert result == {"url": "https://verify.example/session"}
    assert len(db.added) == 1
    assert db.added[0].user_id == "user-123"
    assert db.added[0].aml_status == "pending"
    assert db.commits == 1


def test_start_kyc_reuses_existing_verification_row(monkeypatch):
    async def fake_create_verification_session(user_id, email):
        return {"session_id": "didit-session-123", "url": "https://verify.example/session"}

    monkeypatch.setattr(routes_kyc, "create_verification_session", fake_create_verification_session)
    existing_row = make_verification_row()
    db = FakeKycDb(row=existing_row)
    user = SimpleNamespace(id="user-123", email="creator@example.com")

    result = asyncio.run(routes_kyc.start_kyc(db=db, user=user))

    assert result == {"url": "https://verify.example/session"}
    assert db.added == []
    assert db.commits == 0


def test_verify_didit_signature_accepts_valid_v2_signature(monkeypatch):
    secret = "unit-webhook-secret"
    payload = {
        "session": {
            "session_id": "didit-session-123",
            "metadata": {"user_id": "user-123"},
            "decision": "approved",
            "aml": {"risk_score": 12.0},
        }
    }
    timestamp = 1_800_000_000
    signature = hmac.new(
        secret.encode(),
        routes_kyc.canonical_didit_payload(payload).encode(),
        hashlib.sha256,
    ).hexdigest()

    assert routes_kyc.verify_didit_signature(
        payload=payload,
        raw_body=b"{}",
        headers={"X-Signature-V2": signature, "X-Timestamp": str(timestamp)},
        secret=secret,
        now=timestamp,
    )


def test_verify_didit_signature_rejects_bad_v2_signature():
    payload = {"session": {"session_id": "didit-session-123"}}

    assert not routes_kyc.verify_didit_signature(
        payload=payload,
        raw_body=b"{}",
        headers={"X-Signature-V2": "bad", "X-Timestamp": "1800000000"},
        secret="unit-webhook-secret",
        now=1_800_000_000,
    )


def test_verify_didit_signature_rejects_stale_v2_timestamp():
    secret = "unit-webhook-secret"
    payload = {"session": {"session_id": "didit-session-123"}}
    timestamp = 1_800_000_000
    signature = hmac.new(
        secret.encode(),
        routes_kyc.canonical_didit_payload(payload).encode(),
        hashlib.sha256,
    ).hexdigest()

    assert not routes_kyc.verify_didit_signature(
        payload=payload,
        raw_body=b"{}",
        headers={"X-Signature-V2": signature, "X-Timestamp": str(timestamp)},
        secret=secret,
        now=timestamp + 301,
    )


def test_verify_didit_signature_accepts_legacy_raw_body_signature():
    secret = "unit-webhook-secret"
    raw_body = b'{"session":{"session_id":"didit-session-123"}}'
    signature = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()

    assert routes_kyc.verify_didit_signature(
        payload={"session": {"session_id": "didit-session-123"}},
        raw_body=raw_body,
        headers={"X-Didit-Signature": signature},
        secret=secret,
        now=1_800_000_000,
    )


def test_auth0_settings_are_removed_from_active_config():
    fields = set(Settings.model_fields)

    assert "auth0_domain" not in fields
    assert "auth0_client_id" not in fields
    assert "auth0_client_secret" not in fields
    assert "auth0_m2m_client_id" not in fields
    assert "auth0_m2m_client_secret" not in fields
    assert "auth0_sync_hmac" not in fields


def test_auth0_service_file_is_removed():
    backend_dir = Path(__file__).resolve().parents[1]
    assert not (backend_dir / "app/services/auth0_mgmt.py").exists()
