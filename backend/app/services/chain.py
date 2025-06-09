# app/services/chain.py
import os, time, functools, httpx, logging
from decimal import Decimal
from functools import lru_cache
from app.core.config import get_settings
from app.core.chains import CHAINS


log = logging.getLogger("chain")
settings = get_settings()

# in-memory 15-second cache  {(addr,contract): (expires, balance)}
_cache: dict[tuple[str, str | None], tuple[float, int]] = {}

async def _rpc(url: str, payload: dict):
    async with httpx.AsyncClient(timeout=10) as cli:
        r = await cli.post(url, json=payload); r.raise_for_status(); return r.json()

async def get_eth_balance(address: str, chain_id: int) -> int:
    url = CHAINS()[chain_id]["rpc"]
    key = (address.lower(), chain_id, "native")
    if key in _cache and _cache[key][0] > time.time(): return _cache[key][1]
    data = await _rpc(url, _rpc("eth_getBalance", [address, "latest"]))
    bal  = int(data["result"], 16)
    _cache[key] = (time.time() + 15, bal)
    return bal

async def get_erc20_balance(address: str, token: str, chain_id: int) -> int:
    contract = CHAINS()[chain_id]["tokens"][token]
    url = CHAINS()[chain_id]["rpc"]
    key = (address.lower(), chain_id, contract.lower())
    if key in _cache and _cache[key][0] > time.time(): return _cache[key][1]
    data_field = "0x70a08231000000000000000000000000" + address[2:]
    res = await _rpc(url, _rpc("eth_call", [{"to": contract, "data": data_field}, "latest"]))
    bal = int(res["result"], 16)
    _cache[key] = (time.time() + 15, bal)
    return bal
