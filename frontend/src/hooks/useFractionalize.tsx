import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  useAccount,
  useSwitchChain,
  useWriteContract,
  usePublicClient,
  useChainId,
} from "wagmi";
import type { TransactionReceipt } from "viem";
import { toast } from "sonner";

import VAULT_FACTORY_ABI from "../abi/VaultFactory.json";
import NFT_ABI from "../abi/BluemaroonNFT.json";
import { CHAINS } from "../lib/addresses";
import { api } from "../lib/api";
import {
  extractVaultCreatedAddress,
  fractionalizeStageLabels,
  getExplorerAddressUrl,
  getExplorerTxUrl,
  type FractionalizeStage,
} from "../lib/fractionalTransaction";
import { useChain } from "../context/ChainContext";
import { useCreatorReadiness } from "./useCreatorReadiness";

type FractionalizeInput = {
  nft: `0x${string}`;
  tokenId: number;
  shares: number;
  name?: string;
  symbol?: string;
  roundPrice?: number;
};

export function useFractionalize() {
  const { address: wallet } = useAccount();
  const wagmiChainId = useChainId();
  const ctxChainId = useChain();
  const walletChainId = wagmiChainId ?? ctxChainId ?? 11155111;
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const creatorReadiness = useCreatorReadiness();
  const walletControl = creatorReadiness.walletState;
  const [stage, setStage] = useState<FractionalizeStage>("idle");

  const mutation = useMutation({
    mutationFn: async (p: FractionalizeInput) => {
      if (!creatorReadiness.canUseCreatorActions) {
        throw new Error(creatorReadiness.message);
      }
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

      setStage("checking_vault");
      const predictedVault = (await publicClient.readContract({
        abi: VAULT_FACTORY_ABI,
        address: cfg.factory,
        functionName: "predictVault",
        args: [p.nft, BigInt(p.tokenId), wallet],
      })) as `0x${string}`;

      const bytecode = await publicClient.getBytecode({ address: predictedVault });
      if (bytecode && bytecode !== "0x") {
        setStage("failed");
        throw new Error("Vault already exists for this NFT");
      }

      const approvalPayload = {
        nft_contract: p.nft,
        token_id: p.tokenId,
        approved_spender: predictedVault,
      } as const;

      setStage("approving_nft");
      const approveHash = await writeContractAsync({
        abi: NFT_ABI,
        address: p.nft,
        functionName: "approve",
        args: [predictedVault, BigInt(p.tokenId)],
      });

      setStage("approval_submitted");
      await recordAppTransaction({
        hash: approveHash,
        wallet_address: wallet,
        chain_id: chainId,
        method: "approve_nft",
        status: "submitted",
        payload_json: approvalPayload,
      });

      try {
        const approvalReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
        if (approvalReceipt.status !== "success") {
          await recordAppTransaction({
            hash: approveHash,
            wallet_address: wallet,
            chain_id: chainId,
            method: "approve_nft",
            status: "failed",
            payload_json: {
              ...approvalPayload,
              receipt_status: approvalReceipt.status,
            },
          });
          setStage("failed");
          throw new Error("NFT approval reverted");
        }

        setStage("approval_confirmed");
        await recordAppTransaction({
          hash: approveHash,
          wallet_address: wallet,
          chain_id: chainId,
          method: "approve_nft",
          status: "mined",
          payload_json: approvalPayload,
        });
      } catch (err) {
        if (!(err instanceof Error && err.message === "NFT approval reverted")) {
          await recordAppTransaction({
            hash: approveHash,
            wallet_address: wallet,
            chain_id: chainId,
            method: "approve_nft",
            status: "failed",
            payload_json: approvalPayload,
          });
        }

        setStage("failed");
        throw err;
      }

      toast.info("NFT approved - creating draft...");

      setStage("creating_draft");
      await api.post("/fractional/", {
        nft_contract: p.nft,
        token_id: p.tokenId,
        shares: p.shares,
        chain_id: chainId,
        round_price: p.roundPrice ?? null,
        creator_wallet_address: wallet,
        predicted_vault: predictedVault,
      });

      setStage("opening_wallet");
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

      setStage("vault_submitted");
      const vaultPayload = {
        nft_contract: p.nft,
        token_id: p.tokenId,
        shares: p.shares,
        round_price: p.roundPrice ?? null,
        vault: predictedVault,
      } as const;

      await recordAppTransaction({
        hash: vaultHash,
        wallet_address: wallet,
        chain_id: chainId,
        method: "create_fractional_vault",
        status: "submitted",
        payload_json: vaultPayload,
      });

      setStage("confirming_vault");
      let receipt: TransactionReceipt;
      try {
        receipt = await publicClient.waitForTransactionReceipt({ hash: vaultHash });
      } catch (err) {
        await recordAppTransaction({
          hash: vaultHash,
          wallet_address: wallet,
          chain_id: chainId,
          method: "create_fractional_vault",
          status: "failed",
          payload_json: vaultPayload,
        });
        setStage("failed");
        throw err;
      }

      if (receipt.status !== "success") {
        await recordAppTransaction({
          hash: vaultHash,
          wallet_address: wallet,
          chain_id: chainId,
          method: "create_fractional_vault",
          status: "failed",
          payload_json: {
            ...vaultPayload,
            receipt_status: receipt.status,
          },
        });
        setStage("failed");
        throw new Error("Vault creation reverted");
      }

      const emittedVault = extractVaultCreatedAddress(receipt, cfg.factory, predictedVault);

      setStage("finalizing_listing");
      await api.patch(`/fractional/${emittedVault}`, {
        vault: emittedVault,
        tx_hash: vaultHash,
      });
      await recordAppTransaction({
        hash: vaultHash,
        wallet_address: wallet,
        chain_id: chainId,
        method: "create_fractional_vault",
        status: "mined",
        payload_json: {
          ...vaultPayload,
          vault: emittedVault,
        },
      });

      setStage("active");
      toast.success("Vault created", {
        description: (
          <>
            <a
              href={getExplorerTxUrl(chainId, vaultHash)}
              target="_blank"
              rel="noreferrer"
              className="underline mr-2"
            >
              Tx
            </a>
            <a
              href={getExplorerAddressUrl(chainId, emittedVault)}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Vault
            </a>
          </>
        ),
      });

      return emittedVault;
    },
    onError(err) {
      console.error(err);
      setStage("failed");
      toast.error("Fractionalization failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
  });

  const mutationError = mutation.error instanceof Error ? mutation.error.message : null;
  const readinessError = creatorReadiness.canUseCreatorActions ? null : creatorReadiness.message;
  const errorMsg = mutationError ?? readinessError;
  const stageLabel = fractionalizeStageLabels[stage];

  return {
    ...mutation,
    stage,
    stageLabel,
    errorMsg,
    isReady: creatorReadiness.canUseCreatorActions,
    walletControl,
    creatorReadiness,
  };
}

async function recordAppTransaction(payload: {
  hash: `0x${string}`;
  wallet_address?: `0x${string}`;
  chain_id: number;
  method: string;
  status: "submitted" | "mined" | "failed";
  payload_json: Record<string, unknown>;
}) {
  try {
    await api.post("/transactions/", payload);
  } catch (err) {
    console.warn("App transaction bookkeeping failed", err);
    toast.warning("Transaction succeeded, but app history was not updated.");
  }
}
