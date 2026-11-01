import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface Txn {
  hash: string;
  date: string;
  method: string;
  status: string;
  chainId: number;
  wallet: string | null;
}

type ApiTxn = {
  hash: string;
  wallet_address?: string | null;
  chain_id: number;
  method: string;
  status: string;
  created_at?: string | null;
};

export function useTransactions() {
  return useQuery<Txn[]>({
    queryKey: ["txns"],
    queryFn: async () => {
      const { data } = await api.get<ApiTxn[]>("/transactions/");
      return data.map((tx) => ({
        hash: tx.hash,
        date: tx.created_at ?? "",
        method: tx.method,
        status: tx.status,
        chainId: tx.chain_id,
        wallet: tx.wallet_address ?? null,
      }));
    },
  });
}
