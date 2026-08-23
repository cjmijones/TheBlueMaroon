import { useQuery } from "@tanstack/react-query";

export interface Depth {
  price: string;
  qty: number;
}

export interface OrderBookState {
  bids: Depth[];
  asks: Depth[];
  isAvailable: false;
  reason: string;
}

export function useOrderBook(assetId: string) {
  return useQuery<OrderBookState>({
    queryKey: ["orderBook", assetId, "unavailable"],
    queryFn: async () => ({
      bids: [],
      asks: [],
      isAvailable: false,
      reason: "Market depth is not live until bid and ask data is backed by the database.",
    }),
    staleTime: Infinity,
  });
}
