// src/hooks/useFractionalize.ts
import { useMutation } from "@tanstack/react-query";
import {
  useAccount,
  useSwitchChain,
  useWriteContract,
  usePublicClient,
  useChainId,
} from "wagmi";
import { toast } from "sonner";

import VAULT_FACTORY_ABI from "../abi/VaultFactory.json";
import NFT_ABI from "../abi/BluemaroonNFT.json";
import { CHAINS } from "../lib/addresses";
import { api } from "../lib/api";
import { useChain } from "../context/ChainContext";

export function useFractionalize() {
  const { address: wallet, isConnected } = useAccount();
  const wagmiChainId = useChainId();
  const ctxChainId = useChain();
  const walletChainId = wagmiChainId ?? ctxChainId ?? 11155111;
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  return useMutation({
    mutationFn: async (p: {
      nft: `0x${string}`;
      tokenId: number;
      shares: number;
      name?: string;
      symbol?: string;
      roundPrice?: number;
    }) => {
      if (!isConnected) throw new Error("Connect wallet first");
      if (!wallet) throw new Error("Wallet address not available");
      if (!publicClient) throw new Error("Public client not available");

      const chainId = walletChainId ?? 11155111;
      const cfg = CHAINS[chainId as keyof typeof CHAINS];
      if (!cfg?.factory) {
        throw new Error(`Unsupported chain: ${chainId} and CFG: ${cfg}`);
      }

      if (chainId !== walletChainId && switchChainAsync) {
        await switchChainAsync({ chainId });
      }

      const predicted = await publicClient.readContract({
        abi: VAULT_FACTORY_ABI,
        address: cfg.factory,
        functionName: "predictVault",
        args: [p.nft, BigInt(p.tokenId), wallet],
      }) as `0x${string}`;

      const bytecode = await publicClient.getBytecode({ address: predicted });
      if (bytecode && bytecode !== "0x") {
        throw new Error("Vault already exists for this NFT");
      }

      const approveHash = await writeContractAsync({
        abi: NFT_ABI,
        address: p.nft,
        functionName: "approve",
        args: [predicted, BigInt(p.tokenId)],
      });

      await publicClient.waitForTransactionReceipt({ hash: approveHash });
      await recordAppTransaction({
        hash: approveHash,
        wallet_address: wallet,
        chain_id: chainId,
        method: "approve_nft",
        status: "mined",
        payload_json: {
          nft_contract: p.nft,
          token_id: p.tokenId,
          approved_spender: predicted,
        },
      });
      toast.info("NFT approved - creating vault...");

      await api.post("/fractional/", {
        nft_contract: p.nft,
        token_id: p.tokenId,
        shares: p.shares,
        chain_id: chainId,
        round_price: p.roundPrice ?? null,
        predicted_vault: predicted,
      });

      const vaultHash = await writeContractAsync({
        abi: VAULT_FACTORY_ABI,
        address: cfg.factory,
        functionName: "createVault",
        args: [
          p.nft,
          BigInt(p.tokenId),
          BigInt(p.shares),
          p.name ?? "BMN",
          p.symbol ?? "BMNS",
        ],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: vaultHash });
      if (receipt.status !== "success") throw new Error("Vault creation reverted");

      await api.patch(`/fractional/${predicted}`, {
        vault: predicted,
        tx_hash: vaultHash,
      });
      await recordAppTransaction({
        hash: vaultHash,
        wallet_address: wallet,
        chain_id: chainId,
        method: "create_fractional_vault",
        status: "mined",
        payload_json: {
          nft_contract: p.nft,
          token_id: p.tokenId,
          shares: p.shares,
          round_price: p.roundPrice ?? null,
          vault: predicted,
        },
      });

      toast.success("Vault created", {
        description: (
          <>
            <a
              href={`https://sepolia.etherscan.io/tx/${vaultHash}`}
              target="_blank"
              className="underline mr-2"
            >
              Tx
            </a>
            <a
              href={`https://sepolia.etherscan.io/address/${predicted}`}
              target="_blank"
              className="underline"
            >
              Vault
            </a>
          </>
        ),
      });

      return predicted;
    },
  });
}

async function recordAppTransaction(payload: {
  hash: `0x${string}`;
  wallet_address?: `0x${string}`;
  chain_id: number;
  method: string;
  status: "submitted" | "pending" | "mined" | "failed";
  payload_json: Record<string, unknown>;
}) {
  try {
    await api.post("/transactions/", payload);
  } catch (err) {
    console.warn("App transaction bookkeeping failed", err);
    toast.warning("Transaction succeeded, but app history was not updated.");
  }
}
