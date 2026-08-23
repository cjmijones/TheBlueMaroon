# app/api/routes_kyc.py
import json, hmac, hashlib, logging
from datetime import datetime
from time import time
from typing import Any, Mapping

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user, get_db
from app.crud.roles import assign_role_slug, revoke_role_slug
from app.services.didit import create_verification_session
from app.core.config import get_settings 
from app.models.verification import UserVerification   # ensure this table exists

settings = get_settings()
router = APIRouter(prefix="/kyc", tags=["kyc"])
log = logging.getLogger("kyc")
SIGNATURE_WINDOW_SECONDS = 300


def _redact_id(value: object) -> str:
    text = str(value)
    return text[-6:] if len(text) > 6 else text


def _parse_aml_score(value) -> int:
    if value is None or isinstance(value, bool):
        raise ValueError("Invalid AML risk score")

    if isinstance(value, int):
        return value

    if isinstance(value, float):
        if value.is_integer():
            return int(value)
        raise ValueError("Invalid AML risk score")

    if isinstance(value, str):
        try:
            parsed = float(value)
        except ValueError as exc:
            raise ValueError("Invalid AML risk score") from exc
        if parsed.is_integer():
            return int(parsed)

    raise ValueError("Invalid AML risk score")


def _header(headers: Mapping[str, str], name: str) -> str | None:
    return headers.get(name) or headers.get(name.lower()) or headers.get(name.upper())


def _shorten_floats(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _shorten_floats(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_shorten_floats(item) for item in value]
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return value


def canonical_didit_payload(payload: dict[str, Any]) -> str:
    return json.dumps(
        _shorten_floats(payload),
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )


def _fresh_timestamp(timestamp_header: str | None, now: int | None = None) -> bool:
    if not timestamp_header:
        return False
    try:
        timestamp = int(timestamp_header)
    except (TypeError, ValueError):
        return False
    current = int(time() if now is None else now)
    return abs(current - timestamp) <= SIGNATURE_WINDOW_SECONDS


def _hmac_matches(signature: str | None, body: bytes, secret: str) -> bool:
    if not signature or not secret:
        return False
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(signature, expected)


def verify_didit_signature(
    payload: dict[str, Any],
    raw_body: bytes,
    headers: Mapping[str, str],
    secret: str,
    now: int | None = None,
) -> bool:
    signature_v2 = _header(headers, "X-Signature-V2")
    timestamp = _header(headers, "X-Timestamp")
    if signature_v2:
        if not _fresh_timestamp(timestamp, now=now):
            return False
        canonical = canonical_didit_payload(payload).encode("utf-8")
        return _hmac_matches(signature_v2, canonical, secret)

    raw_signature = _header(headers, "X-Signature") or _header(headers, "X-Didit-Signature")
    return _hmac_matches(raw_signature, raw_body, secret)


def apply_didit_session_update(
    row: UserVerification,
    session: dict,
    now: datetime | None = None,
) -> None:
    timestamp = now or datetime.now()
    aml_score = _parse_aml_score(session["aml"]["risk_score"])
    is_clear = session["decision"] == "approved" and aml_score < 60

    row.didit_session_id = session["session_id"]
    row.aml_score = aml_score
    row.aml_status = "clear" if is_clear else "reject"
    row.id_verified_at = timestamp if is_clear else None
    row.aml_checked_at = timestamp


async def sync_kyc_role_state(db: AsyncSession, user_id: str, aml_status: str) -> None:
    if aml_status == "clear":
        await assign_role_slug(db, user_id, "member")
    elif aml_status == "reject":
        await revoke_role_slug(db, user_id, "member")

# ──────────────────────────────────────────────────────────────
# 1.  POST /kyc/start  → create Didit session
# ──────────────────────────────────────────────────────────────
@router.post("/start", status_code=status.HTTP_201_CREATED)
async def start_kyc(db: AsyncSession = Depends(get_db),
                    user=Depends(get_current_user)) -> dict:
    session = await create_verification_session(user.id, user.email)
    log.info("KYC session started")
    log.debug(
        "KYC session started session_suffix=%s user_suffix=%s",
        _redact_id(session["session_id"]),
        _redact_id(user.id),
    )

    # Ensure verification row exists
    row = await db.get(UserVerification, user.id)
    if not row:
        from app.models.verification import UserVerification as UV
        db.add(UV(user_id=user.id, aml_status="pending"))
        await db.commit()

    return {"url": session["url"]}


# ──────────────────────────────────────────────────────────────
# 2.  Didit webhook  POST /kyc/webhook
# ──────────────────────────────────────────────────────────────
@router.post("/webhook", include_in_schema=False)
async def didit_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    raw = await request.body()
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(400, "Invalid webhook payload") from exc

    if not verify_didit_signature(
        payload=payload,
        raw_body=raw,
        headers=request.headers,
        secret=settings.didit_webhook_secret,
    ):
        raise HTTPException(401, "Invalid signature")

    session = payload["session"]
    user_id = str(session["metadata"]["user_id"])

    log.info("KYC webhook received")
    log.debug(
        "KYC webhook received session_suffix=%s user_suffix=%s",
        _redact_id(session["session_id"]),
        _redact_id(user_id),
    )

    # Update verification status in DB
    row = await db.get(UserVerification, user_id)
    if not row:
        raise HTTPException(404, "User verification row missing")

    apply_didit_session_update(row, session)
    await sync_kyc_role_state(db, user_id, row.aml_status)
    await db.commit()

    return {"ok": True}
