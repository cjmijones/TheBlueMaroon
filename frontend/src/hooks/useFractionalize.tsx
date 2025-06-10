// src/hooks/useFractionalize.ts
import { useMutation } from "@tanstack/react-query";
import { useAccount, useChainId, useSwitchChain, useWriteContract } from "wagmi";
import { toast } from "sonner";
import { api }   from "../lib/api";
import FACTORY_ABI from "../abi/VaultFactory.json";
import { CHAINS } from "../lib/addresses";
import { useChain } from "../context/ChainContext";

export function useFractionalize() {
  const { isConnected }        = useAccount();
  const chainId                = useChainId();
  const { switchChainAsync }   = useSwitchChain();
  const ctxChainId             = useChain();
  const targetChainId          = chainId ?? ctxChainId ?? 1;
  const cfg                    = CHAINS[targetChainId as keyof typeof CHAINS];
  const { writeContractAsync } = useWriteContract();

  const errorMsg =
    !isConnected            ? "Connect wallet first."
    : !cfg                  ? `Unsupported chain (${targetChainId}).`
    : !cfg.factory          ? `Factory address missing for chain ${targetChainId}.`
    : null;

  return useMutation({
    mutationFn: async (p: {
      nft: `0x${string}`; id: number; shares: number;
    }) => {
      if (errorMsg) throw new Error(errorMsg);

      if (chainId && chainId !== targetChainId && switchChainAsync) {
        await switchChainAsync({ chainId: targetChainId });
      }

      /* 1️⃣ backend draft row */
      await api.post("/fractional", {
        nft_contract: p.nft,
        token_id:     p.id,
        shares:       p.shares,
        chain_id:     targetChainId,
      });

      /* 2️⃣ on-chain createVault */
      const txHash = await writeContractAsync({
        abi: FACTORY_ABI,
        address: cfg.factory,
        functionName: "createVault",
        args: [p.nft, BigInt(p.id), BigInt(p.shares), "BMN-SHARE", "BMNS"],
        chainId: targetChainId,
      });

      toast.success("Vault created", { description: txHash });
    },

    onError(err) {
      toast.error("Fractionalize failed", { description: String(err) });
    },
  });
}
