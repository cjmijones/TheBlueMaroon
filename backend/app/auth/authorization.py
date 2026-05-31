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


def _kyc_status(verification: Any, id_verified_at: Any) -> str:
    if verification is None:
        return "not_started"

    aml_status = getattr(verification, "aml_status", None)
    if aml_status == "clear" and id_verified_at:
        return "clear"
    if aml_status == "reject":
        return "reject"
    return "pending"


def build_current_user_summary(user: Any) -> dict[str, Any]:
    roles = _role_slugs(user)
    wallets = list(getattr(user, "wallets", None) or [])
    verification = getattr(user, "verification", None)

    linked_count = len(wallets)
    has_linked_wallet = linked_count > 0
    id_verified_at = getattr(verification, "id_verified_at", None)
    kyc_status = _kyc_status(verification, id_verified_at)
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
