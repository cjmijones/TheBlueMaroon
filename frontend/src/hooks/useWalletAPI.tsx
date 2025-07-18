// useWalletsAPI.tsx
import { useAuth0 } from "@auth0/auth0-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WalletCreate } from "../types";  // ✅ Import the type
import { api } from "../lib/api";   

export function useWallets() {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["wallets"],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      const { data } = await api.get("/wallets/", {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      const token = await getAccessTokenSilently();
      await api.post("/wallets/", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (address: string) => {
      const token = await getAccessTokenSilently();
      await api.delete(`/wallets/${address}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
    },
  });

  return { list, add, remove };
}
