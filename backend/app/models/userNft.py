from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, ForeignKey,
    JSON, UniqueConstraint, func, Numeric
)
from sqlalchemy.orm import declarative_base, relationship

from .base import Base

class UserNFT(Base):
    __tablename__ = "user_nfts"

    wallet_address = Column(String, ForeignKey("wallets.address"), primary_key=True)
    token_id       = Column(String, ForeignKey("nfts.token_id"), primary_key=True)
    acquired_at    = Column(DateTime, default=func.now())

    nft            = relationship("NFT", back_populates="owners")
    wallet         = relationship("Wallet")

