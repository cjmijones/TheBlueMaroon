# app/models/fractional_listing.py
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    func,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .base import Base

class FractionalListing(Base):
    __tablename__ = "fractional_listings"
    __table_args__ = (
        UniqueConstraint("vault", name="uq_fractional_vault"),
    )

    id           = Column(Integer, primary_key=True)
    vault        = Column(String, unique=True)                 # clone address
    vault_salt   = Column(String, nullable=True)               # for dev/debug
    nft_contract = Column(String, nullable=False)
    token_id     = Column(Integer, nullable=False)
    shares       = Column(Integer, nullable=False)
    chain_id     = Column(Integer, nullable=False)

    creator_id   = Column(String, ForeignKey("users.id"))
    creator      = relationship("User", back_populates="fractional_listings")

    created_at   = Column(DateTime, server_default=func.now())
