from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, ForeignKey, func
)
from sqlalchemy.orm import declarative_base, relationship

from .base import Base

# ──────────────────── WALLETS ────────────────────

class Wallet(Base):
    __tablename__ = "wallets"

    address     = Column(String, primary_key=True)                 # 0x…
    user_id     = Column(String, ForeignKey("users.id"))
    chain_id    = Column(Integer)
    ens_name    = Column(String)
    is_primary  = Column(Boolean, default=False)
    linked_at   = Column(DateTime, default=func.now())

    user        = relationship("User", back_populates="wallets")
    txs         = relationship("Transaction", back_populates="wallet")
    orders_as_buyer  = relationship("Order", back_populates="buyer_wallet",
                                    foreign_keys="Order.buyer_wallet_address")
    listings_as_seller = relationship("Listing", back_populates="seller_wallet")