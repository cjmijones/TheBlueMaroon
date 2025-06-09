# app/api/routes_kyc.py
import json, hmac, hashlib, logging
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user, get_db
from app.services.didit import create_verification_session
from app.core.config import get_settings 
from app.services.auth0_mgmt import add_role_to_user
from app.models.verification import UserVerification   # ensure this table exists

settings = get_settings()
router = APIRouter(prefix="/kyc", tags=["kyc"])
log = logging.getLogger("kyc")

# ──────────────────────────────────────────────────────────────
# 1.  POST /kyc/start  → create Didit session
# ──────────────────────────────────────────────────────────────
@router.post("/start", status_code=status.HTTP_201_CREATED)
async def start_kyc(db: AsyncSession = Depends(get_db),
                    user=Depends(get_current_user)) -> dict:
    session = await create_verification_session(user.id, user.email)
    log.info("🚀 KYC session %s started for user %s", session["session_id"], user.id)

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
    sig = request.headers.get("X-Didit-Signature", "")

    computed = hmac.new(
        settings.didit_webhook_secret.encode(), raw, hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(sig, computed):
        raise HTTPException(400, "Invalid signature")

    payload = json.loads(raw)
    session = payload["session"]
    decision = session["decision"]          # 'approved' or 'denied'
    aml_score = session["aml"]["risk_score"]
    user_id: UUID = UUID(session["metadata"]["user_id"])

    log.info("📩 Webhook %s for user %s – decision=%s aml=%s",
             session["session_id"], user_id, decision, aml_score)

    # Update verification status in DB
    row = await db.get(UserVerification, user_id)
    if not row:
        raise HTTPException(404, "User verification row missing")

    row.user_id = session["session_id"]
    row.aml_status = "clear" if aml_score < 60 else "reject"
    if decision == "approved":
        row.id_verified_at = datetime.now()
    row.aml_checked_at = datetime.now()
    await db.commit()

    # Promote role if fully cleared
    if decision == "approved" and aml_score < 60:
        await add_role_to_user(str(user_id), "member")

    return {"ok": True}
