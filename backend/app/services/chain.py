# app/services/chain.py
"""
Light-weight helpers for JSON-RPC reads (native ETH + ERC-20 balances)
with a simple 15-second in-memory cache and several safety nets.

Public functions:
    • get_eth_balance(address, chain_id)  → int (wei)
    • get_erc20_balance(address, token, chain_id)  → int (token base-units)
"""

from __future__ import annotations

import httpx, itertools, logging, time
from typing import Any, Dict, Tuple

from app.core.chains import CHAINS

log = logging.getLogger("chain")

# ────────────────────────────────────────────────────────────────────────────
#  JSON-RPC helpers
# ────────────────────────────────────────────────────────────────────────────
_jsonrpc_id = itertools.count(1).__next__          # incremental id generator


def _payload(method: str, params: list[Any]) -> Dict[str, Any]:
    """Build a JSON-RPC 2.0 payload."""
    return {
        "jsonrpc": "2.0",
        "id": _jsonrpc_id(),
        "method": method,
        "params": params,
    }


async def _rpc(url: str, payload: dict[str, Any]) -> dict[str, Any]:
    """POST the payload and return parsed JSON with robust error handling."""
    try:
        async with httpx.AsyncClient(timeout=10) as cli:
            r = await cli.post(url, json=payload)
            r.raise_for_status()
    except httpx.RequestError as exc:
        log.error("Network error %s → %s", url, exc)
        raise

    data = r.json()
    if "error" in data:
        log.error("RPC error %s → %s", url, data["error"])
        raise ValueError(data["error"]["message"])
    return data


# ────────────────────────────────────────────────────────────────────────────
#  Cache  {(addr_lower, chain_id, contract|native): (expiry_ts, balance_int)}
# ────────────────────────────────────────────────────────────────────────────
_cache: dict[Tuple[str, int, str], Tuple[float, int]] = {}


# ────────────────────────────────────────────────────────────────────────────
#  Utility
# ────────────────────────────────────────────────────────────────────────────
def _hex_to_int(h: str | None) -> int:
    """Convert '0x…' to int; treat '0x', '0x0', or None as zero."""
    if h in (None, "0x", "0x0", "0X", "0X0"):
        return 0
    try:
        return int(h, 16)
    except ValueError as exc:
        raise ValueError(f"unexpected hex value: {h}") from exc


# ────────────────────────────────────────────────────────────────────────────
#  Public helpers
# ────────────────────────────────────────────────────────────────────────────
async def get_eth_balance(address: str, chain_id: int) -> int:
    chains = CHAINS()
    if chain_id not in chains:
        raise ValueError(f"unsupported chain {chain_id}")

    url = chains[chain_id]["rpc"]
    key = (address.lower(), chain_id, "native")

    # 15-second cache hit?
    if key in _cache and _cache[key][0] > time.time():
        return _cache[key][1]

    res = await _rpc(url, _payload("eth_getBalance", [address, "latest"]))
    bal = _hex_to_int(res.get("result"))

    _cache[key] = (time.time() + 15, bal)
    return bal


async def get_erc20_balance(address: str, token: str, chain_id: int) -> int:
    chains = CHAINS()
    if chain_id not in chains:
        raise ValueError(f"unsupported chain {chain_id}")

    try:
        contract = chains[chain_id]["tokens"][token]
    except KeyError:
        raise ValueError(f"token {token} not configured for chain {chain_id}")

    url = chains[chain_id]["rpc"]
    key = (address.lower(), chain_id, contract.lower())

    # 15-second cache hit?
    if key in _cache and _cache[key][0] > time.time():
        return _cache[key][1]

    # balanceOf(address) selector 0x70a08231 + padded address
    data_field = "0x70a08231" + address[2:].rjust(64, "0")
    res = await _rpc(
        url,
        _payload("eth_call", [{"to": contract, "data": data_field}, "latest"]),
    )
    bal = _hex_to_int(res.get("result"))

    _cache[key] = (time.time() + 15, bal)
    return bal
