from pydantic import BaseModel, Field


# ──────────────────────────────── create draft ────────────────────────────────
class FractionalCreate(BaseModel):
    nft_contract: str = Field(
        ...,
        pattern=r"^0x[a-fA-F0-9]{40}$",
    )
    token_id:   int   = Field(..., ge=0)
    shares:     int   = Field(..., gt=0)
    chain_id:   int   = 11155111          # default → Sepolia
    round_price: float | None = None      # optional fixed-price round

    model_config = {"from_attributes": True}   # formerly orm_mode


# ──────────────────────────────── finalize draft ──────────────────────────────
class FractionalFinalize(BaseModel):
    """
    Body of PATCH /fractional/{vault}

    Contains only data that becomes known *after* the on-chain tx is mined.
    """
    tx_hash: str = Field(
        ...,
        pattern=r"^0x[a-fA-F0-9]{64}$",   # 32-byte hex
        description="Transaction hash of VaultFactory.createVault",
    )
