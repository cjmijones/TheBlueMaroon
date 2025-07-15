/* --------------------------------------------------------------
   hooks/useTransactions.ts
-------------------------------------------------------------- */
import { useQuery } from "@tanstack/react-query";

export interface Txn {
  id: string;
  date: string;
  type: "BUY" | "SELL";
  asset: string;
  shares: number;
  price: number;
}

const MOCK_TXNS: Txn[] = [
  { id: "t1", date: "2025-07-01", type: "BUY",  asset: "monet-haystacks",   shares: 10, price: 135 },
  { id: "t2", date: "2025-06-15", type: "SELL", asset: "warhol-campbells", shares:  5, price:  91 },
];

export function useTransactions() {
  return useQuery<Txn[]>({
    queryKey: ["txns"],
    queryFn: () => new Promise((r) => setTimeout(() => r(MOCK_TXNS), 300)),
  });
}
