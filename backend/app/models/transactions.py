from sqlalchemy import (
    Column, String, Integer, DateTime, ForeignKey,
    JSON, func
)
from sqlalchemy.orm import relationship

from .base import Base

# ──────────────────── TRANSACTIONS ────────────────────
class Transaction(Base):
    __tablename__ = "transactions"

    hash            = Column(String, primary_key=True)             # on-chain hash
    user_id         = Column(String, ForeignKey("users.id"), nullable=True)
    wallet_address  = Column(String, ForeignKey("wallets.address"))
    chain_id        = Column(Integer)
    method          = Column(String)                               # e.g. 'mint'
    payload_json    = Column(JSON)
    status          = Column(String)                               # pending/mined/failed
    created_at      = Column(DateTime, default=func.now())
    updated_at      = Column(DateTime, default=func.now(), onupdate=func.now())

    wallet          = relationship("Wallet", back_populates="txs")
