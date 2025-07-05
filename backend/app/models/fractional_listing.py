# app/models/fractional_listing.py
from decimal import Decimal
import sqlalchemy as sa
from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from .base import Base


class FractionalListing(Base):
    """
    One row = one draft / active primary-market round or
    secondary-market vault (depending on how you evolve the flow).

    ┌───────── primary keys / FK
    │
    │  id            surrogate PK
    │  creator       FK → users.id         (who launched the round)
    │
    ├───────── asset being fractionalised
    │
    │  vault         address of the clone (NULL until tx mined)
    │  vault_salt    debug helper – the create2 salt
    │  nft_contract  ERC-721 address
    │  token_id
    │  chain_id
    │
    ├───────── economics
    │
    │  shares        total shares minted for the round
    │  round_price   price per share *at listing time* (Decimal)
    │
    ├───────── lifecycle
    │
    │  created_at
    │  expires_at    default = 7 days after creation
    └───────────────────────────────────────────────────────────────
    """

    __tablename__ = "fractional_listings"
    __table_args__ = (
        UniqueConstraint("vault", name="uq_fractional_vault"),
    )

    # primary key
    id = Column(Integer, primary_key=True)

    # vault clone info (NULL until tx mined)
    vault       = Column(String(42), unique=True, nullable=True)
    vault_salt  = Column(String(66), nullable=True)

    # underlying NFT
    nft_contract = Column(String(42), nullable=False)
    token_id     = Column(BigInteger, nullable=False)
    chain_id     = Column(Integer,   nullable=False)

    # economics
    shares      = Column(Integer, nullable=False)
    round_price = Column(Numeric(18, 8), nullable=True)

    # ---- FK to users table (← reverted field name) -----------------
    creator_id = Column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    creator = relationship("User", back_populates="fractional_listings")

    # timestamps
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    expires_at = Column(
        DateTime(timezone=True),
        server_default=sa.text("now() + '7 days'::interval"),
        nullable=False,
    )

    # helper
    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<FractionalListing id={self.id} nft={self.nft_contract}"
            f"#{self.token_id} shares={self.shares}>"
        )