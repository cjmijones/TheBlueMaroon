import { useQuery } from "@tanstack/react-query";

export interface SellQuoteState {
  eth: null;
  usd: null;
  isAvailable: false;
  reason: string;
}

export function useSellQuote(assetId: string, qty: number) {
  return useQuery<SellQuoteState>({
    queryKey: ["sellQuote", assetId, qty, "unavailable"],
    queryFn: async () => ({
      eth: null,
      usd: null,
      isAvailable: false,
      reason: "Sell quotes are not live until marketplace pricing and settlement are implemented.",
    }),
    staleTime: Infinity,
  });
}
