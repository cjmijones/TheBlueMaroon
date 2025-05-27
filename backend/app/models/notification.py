from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, ForeignKey,
    JSON, UniqueConstraint, func, Numeric
)
from sqlalchemy.orm import declarative_base, relationship

from .base import Base

# ──────────────────── NOTIFICATIONS ────────────────────
class Notification(Base):
    __tablename__ = "notifications"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    user_id    = Column(String, ForeignKey("users.id"))
    type       = Column(String)             # 'order_filled', 'tx_failed', …
    payload    = Column(JSON)
    read_at    = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())

    user       = relationship("User", back_populates="notifications")
