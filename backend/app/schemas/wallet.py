from pydantic import BaseModel
from datetime import datetime

from typing import Annotated
from pydantic import StringConstraints

EthAddress = Annotated[
    str,
    StringConstraints(pattern=r"^0x[a-fA-F0-9]{40}$")
]

class WalletCreate(BaseModel):
    address: EthAddress
    signature: str
    message: str
    nonce: str
    chain_id: int
    ens_name: str | None = None

class WalletRead(BaseModel):
    address: str
    chain_id: int
    ens_name: str | None = None
    is_primary: bool
    linked_at: datetime  # ✅ Matches SQLAlchemy field

    class Config:
        orm_mode = True
