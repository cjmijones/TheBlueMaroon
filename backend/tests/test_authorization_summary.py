from datetime import datetime
from types import SimpleNamespace

from app.auth.authorization import build_current_user_summary


def test_creator_member_with_wallet_and_clear_kyc_gets_expected_summary():
    user = SimpleNamespace(
        id="user_123",
        email="creator@example.com",
        name="Creator",
        picture="https://example.com/avatar.png",
        roles=[
            SimpleNamespace(slug="member"),
            SimpleNamespace(slug="creator"),
        ],
        wallets=[SimpleNamespace(address="0x123")],
        verification=SimpleNamespace(
            aml_status="clear",
            id_verified_at=datetime(2026, 5, 30, 12, 15, 0),
        ),
        created_at=datetime(2026, 5, 1, 9, 0, 0),
        last_login=datetime(2026, 5, 30, 12, 30, 0),
    )

    summary = build_current_user_summary(user)

    assert summary == {
        "user_id": "user_123",
        "email": "creator@example.com",
        "name": "Creator",
        "picture": "https://example.com/avatar.png",
        "roles": ["creator", "member"],
        "verification": {
            "kyc_status": "clear",
            "id_verified_at": "2026-05-30T12:15:00",
        },
        "wallets": {
            "linked_count": 1,
            "has_linked_wallet": True,
        },
        "capabilities": {
            "can_transact": True,
            "can_create_asset": True,
            "can_fractionalize": True,
        },
        "created_at": "2026-05-01T09:00:00",
        "last_login": "2026-05-30T12:30:00",
    }


def test_member_wallet_role_alone_does_not_grant_wallet_or_capabilities():
    user = SimpleNamespace(
        id="user_456",
        email=None,
        name=None,
        picture=None,
        roles=[SimpleNamespace(slug="member_wallet")],
        wallets=[],
        verification=SimpleNamespace(
            aml_status="clear",
            id_verified_at=datetime(2026, 5, 30, 12, 15, 0),
        ),
        created_at=None,
        last_login=None,
    )

    summary = build_current_user_summary(user)

    assert summary["roles"] == ["member_wallet"]
    assert summary["verification"] == {
        "kyc_status": "clear",
        "id_verified_at": "2026-05-30T12:15:00",
    }
    assert summary["wallets"] == {
        "linked_count": 0,
        "has_linked_wallet": False,
    }
    assert summary["capabilities"] == {
        "can_transact": False,
        "can_create_asset": False,
        "can_fractionalize": False,
    }


def test_clear_aml_without_id_verification_reports_pending_and_blocks_kyc_capabilities():
    user = SimpleNamespace(
        id="user_789",
        email="creator@example.com",
        name="Creator",
        picture=None,
        roles=[SimpleNamespace(slug="creator")],
        wallets=[SimpleNamespace(address="0x123")],
        verification=SimpleNamespace(
            aml_status="clear",
            id_verified_at=None,
        ),
        created_at=None,
        last_login=None,
    )

    summary = build_current_user_summary(user)

    assert summary["verification"] == {
        "kyc_status": "pending",
        "id_verified_at": None,
    }
    assert summary["capabilities"] == {
        "can_transact": False,
        "can_create_asset": False,
        "can_fractionalize": False,
    }


def test_missing_verification_reports_not_started_and_reject_blocks_kyc_capabilities():
    unstarted_user = SimpleNamespace(
        id="user_no_kyc",
        roles=[SimpleNamespace(slug="creator")],
        wallets=[SimpleNamespace(address="0x123")],
        verification=None,
    )
    rejected_user = SimpleNamespace(
        id="user_rejected",
        roles=[SimpleNamespace(slug="creator")],
        wallets=[SimpleNamespace(address="0x123")],
        verification=SimpleNamespace(
            aml_status="reject",
            id_verified_at=datetime(2026, 5, 30, 12, 15, 0),
        ),
    )

    unstarted_summary = build_current_user_summary(unstarted_user)
    rejected_summary = build_current_user_summary(rejected_user)

    assert unstarted_summary["verification"] == {
        "kyc_status": "not_started",
        "id_verified_at": None,
    }
    assert unstarted_summary["capabilities"]["can_transact"] is False
    assert unstarted_summary["capabilities"]["can_create_asset"] is False
    assert unstarted_summary["capabilities"]["can_fractionalize"] is False
    assert rejected_summary["verification"] == {
        "kyc_status": "reject",
        "id_verified_at": "2026-05-30T12:15:00",
    }
    assert rejected_summary["capabilities"]["can_transact"] is False
    assert rejected_summary["capabilities"]["can_fractionalize"] is False
