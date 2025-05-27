from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, ForeignKey,
    JSON, UniqueConstraint, func, Numeric
)
from sqlalchemy.orm import declarative_base, relationship

from .base import Base

# ──────────────────── NFT (optional) ────────────────────
class NFT(Base):
    __tablename__ = "nfts"

    token_id      = Column(String, primary_key=True)
    contract      = Column(String)
    chain_id      = Column(Integer)
    metadata_uri  = Column(String)

    owners        = relationship("UserNFT", back_populates="nft")
