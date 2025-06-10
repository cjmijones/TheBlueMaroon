# app/services/alchemy.py
import httpx, logging

log = logging.getLogger("alchemy")
log = logging.getLogger("services.alchemy")

async def fetch_assets(rpc_url: str, owner: str, cursor: str | None, limit: int):
    log.debug("Alchemy call owner=%s cursor=%s limit=%s", owner, cursor, limit)
    endpoint = f"{rpc_url}/getNFTsForOwner"
    params = { "owner": owner, "pageSize": limit }
    if cursor: params["pageKey"] = cursor

    async with httpx.AsyncClient(timeout=10) as cli:
        r = await cli.get(endpoint, params=params)
        r.raise_for_status()
        raw = r.json()

    # minimal transform so the frontend doesn’t know Alchemy field names
    items = []
    for nft in raw.get("ownedNfts", []):
        items.append({
            "contract":  nft["contract"]["address"],
            "tokenId":   nft["id"]["tokenId"],
            "title":     nft["title"],
            "image":     nft["metadata"].get("image") if nft.get("metadata") else None,
            "time":      nft.get("timeLastUpdated"),
            "type":      "nft",
        })

    log.debug("Alchemy raw result keys=%s", list(raw.keys()))

    return { "items": items, "next": raw.get("pageKey") }
