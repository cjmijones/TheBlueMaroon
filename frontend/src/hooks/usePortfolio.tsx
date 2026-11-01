import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export type PortfolioWallet = {
  address: string;
  chain_id: number;
  chain_name: string;
  native_symbol: string;
  ens_name?: string | null;
  is_primary: boolean;
  is_linked: boolean;
  is_connected: boolean;
  linked_at?: string | null;
  balances?: {
    native_wei: string;
    usdc: string;
  } | null;
  errors: string[];
};

export type OwnedAsset = {
  contract: string;
  tokenId: string;
  title?: string;
  image?: string | null;
  time?: string | null;
  type: string;
  owner_address: string;
  chain_id: number;
  chain_name?: string;
  lifecycle: "owned_nft";
  can_fractionalize: boolean;
};

export type CreatedAsset = {
  id: string;
  source_id?: number;
  title?: string | null;
  description?: string | null;
  metadata_uri?: string | null;
  image_url?: string | null;
  nft_contract?: string | null;
  token_id?: string | null;
  owner_wallet_address?: string | null;
  chain_id?: number | null;
  vault?: string | null;
  shares?: number | null;
  round_price?: string | null;
  status: string;
  lifecycle: "metadata_asset" | "minted_asset" | "draft_asset" | "fractionalized_asset";
  tx_hash?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  updated_at?: string | null;
};

export type PortfolioResponse = {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    picture?: string | null;
  };
  wallets: PortfolioWallet[];
  owned_assets: OwnedAsset[];
  created_assets: CreatedAsset[];
  positions: unknown[];
  lifecycle_counts: {
    owned_nfts: number;
    app_assets?: number;
    draft_assets: number;
    minted_assets?: number;
    fractionalized_assets: number;
    positions: number;
  };
};

export function usePortfolio(connectedAddress?: string, connectedChainId?: number) {
  return useQuery<PortfolioResponse>({
    queryKey: ["portfolio", "me", connectedAddress, connectedChainId],
    queryFn: async () => {
      const { data } = await api.get("/portfolio/me", {
        params: {
          connected_address: connectedAddress,
          connected_chain_id: connectedChainId,
        },
      });
      return data;
    },
  });
}
