import { useQuery } from "@tanstack/react-query";

export interface Asset {
  id: string;
  title: string;
  images: string[];
  price_per_share: number;
  total_shares: number;
  shares_sold: number;
  description: string;
  documents: { name: string; url: string }[];
  recentActivity: { tx: string; date: string; amount: number }[];
}

export interface AssetUnavailable {
  asset: null;
  reason: string;
}

export function useAsset(id: string) {
  return useQuery<AssetUnavailable>({
    queryKey: ["asset", id, "unavailable"],
    queryFn: async () => ({
      asset: null,
      reason:
        "Marketplace asset details are hidden until live asset listing routes are implemented.",
    }),
    staleTime: Infinity,
  });
}
