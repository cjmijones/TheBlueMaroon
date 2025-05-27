from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, ForeignKey,
    JSON, UniqueConstraint, func, Numeric
)
from sqlalchemy.orm import declarative_base, relationship

from .base import Base

class Order(Base):
    __tablename__ = "orders"

    id                     = Column(Integer, primary_key=True, autoincrement=True)
    buyer_wallet_address   = Column(String, ForeignKey("wallets.address"))
    listing_id             = Column(Integer, ForeignKey("listings.id"))
    amount_wei             = Column(Numeric(precision=78, scale=0))
    status                 = Column(String, default="pending")  # pending / settled / failed
    tx_hash                = Column(String, ForeignKey("transactions.hash"), nullable=True)
    created_at             = Column(DateTime, default=func.now())

    buyer_wallet           = relationship("Wallet", back_populates="orders_as_buyer",
                                          foreign_keys=[buyer_wallet_address])
    listing                = relationship("Listing", back_populates="orders")
    tx                     = relationship("Transaction", uselist=False)
