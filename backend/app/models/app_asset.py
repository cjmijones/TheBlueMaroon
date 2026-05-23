from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from .base import Base


class AppAsset(Base):
    __tablename__ = "app_assets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    creator_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    owner_wallet_address = Column(String(42), nullable=True)
    chain_id = Column(Integer, nullable=True)
    nft_contract = Column(String(42), nullable=True)
    token_id = Column(String, nullable=True)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    metadata_uri = Column(String, nullable=False)
    image_url = Column(String, nullable=True)

    status = Column(String, default="metadata_ready", nullable=False)
    mint_tx_hash = Column(String(66), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    creator = relationship("User", back_populates="app_assets")
