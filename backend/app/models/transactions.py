from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, ForeignKey,
    JSON, UniqueConstraint, func, Numeric
)
from sqlalchemy.orm import declarative_base, relationship

from .base import Base

# ──────────────────── TRANSACTIONS ────────────────────
class Transaction(Base):
    __tablename__ = "transactions"

    hash            = Column(String, primary_key=True)             # on-chain hash
    wallet_address  = Column(String, ForeignKey("wallets.address"))
    chain_id        = Column(Integer)
    method          = Column(String)                               # e.g. 'mint'
    payload_json    = Column(JSON)
    status          = Column(String)                               # pending/mined/failed
    created_at      = Column(DateTime, default=func.now())

    wallet          = relationship("Wallet", back_populates="txs")
