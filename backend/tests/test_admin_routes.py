from datetime import datetime
from types import SimpleNamespace

from app.api.routes_admin import admin_user_payload


def test_admin_user_payload_includes_operations_state_without_secrets():
    user = SimpleNamespace(
        id="user-123",
        email="creator@example.com",
        name="Creator",
        picture="https://example.com/avatar.png",
        roles=[
            SimpleNamespace(slug="creator"),
            SimpleNamespace(slug="admin"),
        ],
        wallets=[
            SimpleNamespace(
                address="0x1234567890abcdef",
                chain_id=11155111,
                ens_name=None,
                is_primary=True,
                linked_at=datetime(2026, 6, 7, 10, 30, 0),
            )
        ],
        verification=SimpleNamespace(
            aml_status="clear",
            aml_score=12,
            didit_session_id="didit-session-123",
            id_verified_at=datetime(2026, 6, 7, 11, 0, 0),
            aml_checked_at=datetime(2026, 6, 7, 11, 5, 0),
        ),
        created_at=datetime(2026, 6, 1, 9, 0, 0),
        last_login=datetime(2026, 6, 7, 12, 0, 0),
    )

    payload = admin_user_payload(user)

    assert payload["user_id"] == "user-123"
    assert payload["roles"] == ["admin", "creator"]
    assert payload["verification"] == {
        "kyc_status": "clear",
        "id_verified_at": "2026-06-07T11:00:00",
        "aml_status": "clear",
        "aml_score": 12,
        "aml_checked_at": "2026-06-07T11:05:00",
        "didit_session_id": "didit-session-123",
    }
    assert payload["wallets"]["linked_count"] == 1
    assert payload["wallets"]["items"] == [
        {
            "address": "0x1234567890abcdef",
            "chain_id": 11155111,
            "ens_name": None,
            "is_primary": True,
            "linked_at": "2026-06-07T10:30:00",
        }
    ]
    assert payload["capabilities"] == {
        "can_transact": True,
        "can_create_asset": True,
        "can_fractionalize": True,
    }
