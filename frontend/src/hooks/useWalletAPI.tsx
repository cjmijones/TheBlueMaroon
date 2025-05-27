import { useAuth0 } from "@auth0/auth0-react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const api = axios.create({ baseURL: `${import.meta.env.VITE_API_URL}/api` });

export function useWallets() {
  const { getAccessTokenSilently } = useAuth0();
  const qc = useQueryClient();

  // helper to attach bearer token
  const authed = async () => {
    api.defaults.headers.common[
      "Authorization"
    ] = `Bearer ${await getAccessTokenSilently()}`;
  };

  const list = useQuery({
    queryKey: ["wallets"],
    queryFn: async () => {
      await authed();
      const { data } = await api.get("/wallets");
      console.log("Wallet API response:", data);
      return data as { address: string; created_at: string; is_primary: boolean }[];
    },
  });

  const add = useMutation({
    mutationFn: async (body: { address: string; signature: string; message: string }) => {
      await authed();
      await api.post("/wallets", body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallets"] }),
  });

  const remove = useMutation({
    mutationFn: async (address: string) => {
      await authed();
      await api.delete(`/wallets/${address}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallets"] }),
  });

  return { list, add, remove };
}
