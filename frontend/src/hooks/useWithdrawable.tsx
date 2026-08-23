import { useQuery } from "@tanstack/react-query";

export interface WithdrawableState {
  eth: null;
  usd: null;
  isAvailable: false;
  reason: string;
}

export function useWithdrawable() {
  return useQuery<WithdrawableState>({
    queryKey: ["withdrawable", "unavailable"],
    queryFn: async () => ({
      eth: null,
      usd: null,
      isAvailable: false,
      reason: "Withdrawable balances are not connected to a live settlement source yet.",
    }),
    staleTime: Infinity,
  });
}
