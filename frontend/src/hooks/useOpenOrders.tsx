import { useQuery } from "@tanstack/react-query";

export interface Order {
  id: string;
  qty: number;
  price: string;
  status: string;
}

export interface OpenOrdersState {
  orders: Order[];
  isAvailable: false;
  reason: string;
}

export function useOpenOrders(assetId: string) {
  return useQuery<OpenOrdersState>({
    queryKey: ["openOrders", assetId, "unavailable"],
    queryFn: async () => ({
      orders: [],
      isAvailable: false,
      reason: "Open orders are not live until marketplace order routes are implemented.",
    }),
    staleTime: Infinity,
  });
}
