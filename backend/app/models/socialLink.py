from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, ForeignKey,
    JSON, UniqueConstraint, func, Numeric
)
from sqlalchemy.orm import declarative_base, relationship

from .base import Base

# ──────────────────── SOCIALS ────────────────────
class SocialLink(Base):
    __tablename__ = "social_links"

    id        = Column(Integer, primary_key=True, autoincrement=True)
    user_id   = Column(String, ForeignKey("users.id"))
    platform  = Column(String)                    # 'twitter', 'instagram', …
    url       = Column(String)

    user      = relationship("User", back_populates="socials")

    __table_args__ = (UniqueConstraint("user_id", "platform", name="uq_user_platform"),)
