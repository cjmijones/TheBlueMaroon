import { useMutation } from "@tanstack/react-query";
import { useWriteContract } from "wagmi";
import { api } from "../lib/api";
import FACTORY_ABI from "../abi/VaultFactory.json";

/**
 * Record a “listing in flight” row, then call Factory.createVault().
 */
export function useFractionalize() {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    mutationFn: async (p: {
      nft: `0x${string}`;
      id: number;
      shares: number;
      chain_id?: number;        // optional – falls back to Sepolia
    }) => {
      const chain = p.chain_id ?? 11155111;

      /* 1️⃣  Inform backend (persists draft row) */
      await api.post("/fractional", {
        nft_contract: p.nft,
        token_id:     p.id,
        shares:       p.shares,
        chain_id:     chain,
      });

      /* 2️⃣  User signs factory call */
      await writeContractAsync({
        abi: FACTORY_ABI,
        address: import.meta.env.VITE_FACTORY_ADDRESS as `0x${string}`,
        functionName: "createVault",
        args: [
          p.nft,
          BigInt(p.id),
          BigInt(p.shares),
          "BMN-SHARE",
          "BMNS",
        ],
        chainId: chain,
      });
    },
  });
}
