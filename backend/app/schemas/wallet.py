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
    signature: str       # SIWE signature for link request
    message: str         # original SIWE message

class WalletRead(BaseModel):
    address: EthAddress
    created_at: datetime
    is_primary: bool
