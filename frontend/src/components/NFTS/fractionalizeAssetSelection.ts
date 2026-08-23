import type { CreatedAsset, PortfolioWallet } from "../../hooks/usePortfolio";
import { isSameAddress } from "../../hooks/useWalletControlState";

export type FractionalizableAsset = CreatedAsset & {
  nft_contract: string;
  token_id: string;
  chain_id: number;
  owner_wallet_address: string;
};

export function fractionalAssetKey(asset: {
  nft_contract?: string | null;
  token_id?: string | null;
  chain_id?: number | null;
}) {
  if (!asset.nft_contract || !asset.token_id || !asset.chain_id) return null;
  return `${asset.chain_id}:${asset.nft_contract.toLowerCase()}:${asset.token_id}`;
}

function hasLinkedOwner(asset: CreatedAsset, wallets: PortfolioWallet[]) {
  return wallets.some(
    (wallet) => wallet.is_linked && isSameAddress(wallet.address, asset.owner_wallet_address),
  );
}

function isCompleteMintedAsset(asset: CreatedAsset): asset is FractionalizableAsset {
  return Boolean(
    asset.status === "minted" &&
      asset.lifecycle === "minted_asset" &&
      asset.nft_contract &&
      asset.token_id &&
      asset.chain_id &&
      asset.owner_wallet_address,
  );
}

export function getFractionalizableAssets(
  assets: CreatedAsset[],
  wallets: PortfolioWallet[],
) {
  const blockedKeys = new Set(
    assets
      .filter((asset) => asset.lifecycle === "draft_asset" || asset.lifecycle === "fractionalized_asset")
      .map(fractionalAssetKey)
      .filter((key): key is string => Boolean(key)),
  );

  return assets.filter((asset): asset is FractionalizableAsset => {
    if (!isCompleteMintedAsset(asset)) return false;
    const key = fractionalAssetKey(asset);
    return Boolean(key && !blockedKeys.has(key) && hasLinkedOwner(asset, wallets));
  });
}

export function describeFractionalizableAsset(asset: FractionalizableAsset) {
  const token = asset.token_id ? `#${asset.token_id}` : "Token";
  return asset.title ? `${asset.title} ${token}` : token;
}
