import { CreatedAsset, usePortfolio } from "./usePortfolio";

export interface Position {
  id: string;
  title: string;
  shares: number | null;
  currentPrice: number | null;
  avgPrice: number | null;
  image_url?: string | null;
  withdrawable: number | null;
  vault?: string | null;
  nft_contract?: string | null;
  token_id?: string | null;
  owner_wallet_address?: string | null;
  chain_id?: number | null;
  status: string;
  tx_hash?: string | null;
  round_price?: string | null;
  priceAvailable: boolean;
  navAvailable: boolean;
}

export function mapCreatedAssetToPosition(asset: CreatedAsset): Position {
  return {
    id: asset.id,
    title: asset.title || assetIdentity(asset),
    shares: asset.shares ?? null,
    currentPrice: null,
    avgPrice: null,
    image_url: asset.image_url,
    withdrawable: null,
    vault: asset.vault,
    nft_contract: asset.nft_contract,
    token_id: asset.token_id,
    owner_wallet_address: asset.owner_wallet_address,
    chain_id: asset.chain_id,
    status: asset.status,
    tx_hash: asset.tx_hash,
    round_price: asset.round_price,
    priceAvailable: false,
    navAvailable: false,
  };
}

export function usePositions() {
  const query = usePortfolio();
  const positions =
    query.data?.created_assets
      .filter((asset) => asset.lifecycle === "fractionalized_asset")
      .map(mapCreatedAssetToPosition) ?? [];

  return {
    ...query,
    data: positions,
  };
}

function assetIdentity(asset: CreatedAsset) {
  if (asset.nft_contract && asset.token_id) {
    return `${truncateAddress(asset.nft_contract)} #${asset.token_id}`;
  }
  return "Launched creator asset";
}

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
