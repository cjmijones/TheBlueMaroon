// useWalletsAPI.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WalletCreate } from "../types";
import { api } from "../lib/api";

export function useWallets() {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["wallets"],
    queryFn: async () => {
      const { data } = await api.get("/wallets/");
      return data as {
        address: string;
        chain_id: number;
        is_primary: boolean;
        linked_at: string;
        ens_name?: string;
      }[];
    },
  });

  const add = useMutation({
    mutationFn: async (payload: WalletCreate) => {
      await api.post("/wallets/", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (address: string) => {
      await api.delete(`/wallets/${address}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });

  return { list, add, remove };
}
