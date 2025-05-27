from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, ForeignKey,
    JSON, UniqueConstraint, func, Numeric
)
from sqlalchemy.orm import declarative_base, relationship

from .base import Base

# ──────────────────── MARKETPLACE ────────────────────
class Listing(Base):
    __tablename__ = "listings"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    seller_wallet_address = Column(String, ForeignKey("wallets.address"))
    title           = Column(String)
    description     = Column(String)
    price_wei       = Column(Numeric(precision=78, scale=0))  # support up to 256-bit
    status          = Column(String, default="active")         # active / filled / cancelled
    created_at      = Column(DateTime, default=func.now())

    seller_wallet   = relationship("Wallet", back_populates="listings_as_seller")
    orders          = relationship("Order", back_populates="listing")
