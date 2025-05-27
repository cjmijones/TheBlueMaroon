from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, ForeignKey,
    JSON, UniqueConstraint, func, Numeric
)
from sqlalchemy.orm import declarative_base, relationship

from .base import Base

# ──────────────────── ADDRESSES ────────────────────
class Address(Base):
    __tablename__ = "addresses"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    user_id     = Column(String, ForeignKey("users.id"))
    country     = Column(String)
    state       = Column(String)
    city        = Column(String)
    postal_code = Column(String)
    tax_id      = Column(String)
    label       = Column(String)      # 'home', 'office', …

    user        = relationship("User", back_populates="addresses")
