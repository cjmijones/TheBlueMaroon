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
import NFT_ABI           from "../abi/BluemaroonNFT.json";
import { CHAINS }        from "../lib/addresses";
import { api }           from "../lib/api";
import { useChain }      from "../context/ChainContext";

export function useFractionalize() {
  /* ─────────────────────── context ─────────────────────── */
  const { address: wallet, isConnected } = useAccount();
  // ① wallet network reported by wagmi
  const wagmiChainId   = useChainId();   // e.g. 11155111 for Sepolia

  // ② optional chain selected in your UI
  const ctxChainId     = useChain();     // falls back to 11155111 (Sepolia)

  // ③ final chain we’ll use
  const walletChainId        = wagmiChainId ?? ctxChainId ?? 11155111;
  const { switchChainAsync }             = useSwitchChain();
  const { writeContractAsync }           = useWriteContract();
  const publicClient                     = usePublicClient();

  return useMutation({
    mutationFn: async (p: {
      nft: `0x${string}`;
      tokenId: number;
      shares:  number;
      name?:   string;   // "BMN"
      symbol?: string;   // "BMNS"
      roundPrice?: number;
    }) => {
      /* 0. sanity / network ------------------------------------------------ */
      if (!isConnected) throw new Error("Connect wallet first");
      if (!publicClient) throw new Error("Public client not available");
      const chainId = walletChainId ?? 11155111;                       // default Sepolia
      const cfg     = CHAINS[chainId as keyof typeof CHAINS];
      if (!cfg?.factory) {
        const errChainId = chainId;
        throw new Error(`Unsupported chain: ${errChainId} and CFG: ${cfg}`);
      }

      if (chainId !== walletChainId && switchChainAsync)
        await switchChainAsync({ chainId });

      /* 1. predict deterministic address ---------------------------------- */
      const predicted = await publicClient.readContract({
        abi:      VAULT_FACTORY_ABI,
        address:  cfg.factory,
        functionName: "predictVault",
        args:     [p.nft, BigInt(p.tokenId), wallet!],
      }) as `0x${string}`;

      // --------------------------------------------------------------
      // 1.5 check if *code* exists at that address
      //    (non-empty code  ≙  vault already deployed)
      // --------------------------------------------------------------
      const bytecode = await publicClient.getBytecode({ address: predicted });
      if (bytecode && bytecode !== "0x") {
        throw new Error("Vault already exists for this NFT");
      }

      /* 2. approve the vault to pull the NFT ------------------------------- */
      const approveHash = await writeContractAsync({
        abi:      NFT_ABI,
        address:  p.nft,
        functionName: "approve",
        args:     [predicted, BigInt(p.tokenId)],
      });

      await publicClient.waitForTransactionReceipt({ hash: approveHash });
      toast.info("NFT approved – creating vault…");

      /* 3. backend draft row ---------------------------------------------- */
      await api.post("/fractional/", {
        nft_contract: p.nft,
        token_id:     p.tokenId,
        shares:       p.shares,
        chain_id:     chainId,
        round_price:  p.roundPrice ?? null,
        predicted_vault: predicted,          // helpful for later PATCH
      });

      /* 4. createVault TX -------------------------------------------------- */
      const vaultHash = await writeContractAsync({
        abi:         VAULT_FACTORY_ABI,
        address:     cfg.factory,
        functionName:"createVault",
        args: [
          p.nft,
          BigInt(p.tokenId),
          BigInt(p.shares),
          p.name   ?? "BMN",
          p.symbol ?? "BMNS",
        ],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: vaultHash });
      if (receipt.status !== "success") throw new Error("Vault creation reverted");

      /* 5. PATCH backend with real tx-data -------------------------------- */
      await api.patch(`/fractional/${predicted}`, {
        vault: predicted,
        tx_hash: vaultHash,
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

      return predicted;  // components can refresh balances
    },
  });
}
