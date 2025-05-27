from sqlalchemy import (
    Column, String, Integer, DateTime, ForeignKey,
    JSON, func
)
from sqlalchemy.orm import declarative_base, relationship

from .base import Base

# ──────────────────── AUDIT EVENTS ────────────────────
class AuditEvent(Base):
    __tablename__ = "audit_events"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    user_id     = Column(String, ForeignKey("users.id"), nullable=True)
    action      = Column(String)            # 'login', 'link_wallet', …
    audit_event_metadata    = Column(JSON)
    created_at  = Column(DateTime, default=func.now())

    user        = relationship("User", back_populates="audits")