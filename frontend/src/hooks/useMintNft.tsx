// src/hooks/useMintNft.ts
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { toast } from "sonner";

import NFT_ABI from "../abi/BluemaroonNFT.json";
import { CHAINS } from "../lib/addresses";
import { api } from "../lib/api";
import {
  extractMintedTokenId,
  getExplorerTxUrl,
  mintStageLabels,
  type MintStage,
} from "../lib/mintTransaction";
import { normalizeMintError } from "../components/NFTS/mintValidation";
import { useChain } from "../context/ChainContext";
import { useCreatorReadiness } from "./useCreatorReadiness";

interface MintResp {
  asset_id: number;
  token_uri: string;
  image_url: string;
}

export function useMintNft() {
  /* Wallet & network ---------------------------------------------- */
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();
  const ctxChainId = useChain(); // default from <ChainContext>
  const targetChainId = chainId ?? ctxChainId ?? 1;
  const creatorReadiness = useCreatorReadiness();
  const walletControl = creatorReadiness.walletState;
  const [stage, setStage] = useState<MintStage>("idle");

  /* Chain config lookup ------------------------------------------- */
  const chainCfg = CHAINS[targetChainId as keyof typeof CHAINS];
  const nftAddress = chainCfg?.nft;

  /* Compose readiness / error state ------------------------------- */
  let errorMsg: string | null = null;
  if (!creatorReadiness.canUseCreatorActions) {
    errorMsg = creatorReadiness.message;
  } else if (!chainCfg) {
    errorMsg = `Unsupported chain (${targetChainId}). Switch to Sepolia or Mainnet.`;
  } else if (!nftAddress) {
    errorMsg = `NFT contract address missing for chain ${targetChainId}.`;
  } else if (!publicClient) {
    errorMsg = "Public client not available.";
  }

  const isReady = errorMsg === null;
  const { writeContractAsync } = useWriteContract();
  const stageLabel = mintStageLabels[stage];

  /* Mutation ------------------------------------------------------- */
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      if (!isReady) throw new Error(errorMsg!);
      if (!publicClient) throw new Error("Public client not available.");

      const recordTransaction = async (
        txHash: `0x${string}`,
        status: "submitted" | "mined" | "failed",
        payloadJson: Record<string, unknown>,
      ) => {
        try {
          await api.post("/transactions/", {
            hash: txHash,
            wallet_address: address,
            chain_id: targetChainId,
            method: "mint_nft",
            status,
            payload_json: payloadJson,
          });
        } catch (recordErr) {
          console.warn(`Mint ${status} bookkeeping failed`, recordErr);
          const warningMessage =
            status === "submitted"
              ? "Mint was submitted, but app history was not updated."
              : status === "mined"
                ? "Mint succeeded, but app history was not updated."
                : "Mint failed, but app history was not updated.";
          toast.warning(warningMessage);
        }
      };

      const patchMintAsset = async (
        assetId: number,
        txHash: `0x${string}`,
        status: "minted" | "mint_failed",
        tokenId: string | null,
      ) => {
        try {
          await api.patch(`/nfts/assets/${assetId}/minted`, {
            tx_hash: txHash,
            status,
            token_id: tokenId,
            owner_wallet_address: address ?? null,
            chain_id: targetChainId,
            nft_contract: nftAddress,
          });
        } catch (patchErr) {
          console.warn("Mint asset bookkeeping failed", patchErr);
          toast.warning("Mint status was not saved to the asset record.");
        }
      };

      /* Ensure wallet on correct network */
      if (chainId && chainId !== targetChainId && switchChainAsync) {
        await switchChainAsync({ chainId: targetChainId });
      }

      /* 1. Upload metadata */
      setStage("uploading_metadata");
      form.set("chain_id", String(targetChainId));
      form.set("nft_contract", nftAddress!);
      if (address) form.set("owner_wallet_address", address);
      const { data } = await api.post<MintResp>("/nfts/metadata", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const uploadedAsset = data;

      /* 2. Mint */
      setStage("opening_wallet");
      const txHash = await writeContractAsync({
        abi: NFT_ABI,
        address: nftAddress!, // safe because isReady === true
        functionName: "mint",
        args: [data.token_uri],
        chainId: targetChainId,
      });

      setStage("submitted");
      await recordTransaction(txHash, "submitted", {
        asset_id: data.asset_id,
        nft_contract: nftAddress,
        token_uri: data.token_uri,
        image_url: data.image_url,
      });

      try {
        setStage("confirming");
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

        if (receipt.status !== "success") {
          setStage("bookkeeping");
          await recordTransaction(txHash, "failed", {
            asset_id: data.asset_id,
            nft_contract: nftAddress,
            token_uri: data.token_uri,
            image_url: data.image_url,
            receipt_status: receipt.status,
          });
          await patchMintAsset(uploadedAsset.asset_id, txHash, "mint_failed", null);
          setStage("failed");
          throw new Error("Mint transaction reverted");
        }

        const tokenId = extractMintedTokenId(receipt, nftAddress!, address);
        setStage("bookkeeping");
        await recordTransaction(txHash, "mined", {
          asset_id: data.asset_id,
          nft_contract: nftAddress,
          token_uri: data.token_uri,
          image_url: data.image_url,
          token_id: tokenId?.toString() ?? null,
        });
        await patchMintAsset(uploadedAsset.asset_id, txHash, "minted", tokenId?.toString() ?? null);
        setStage("mined");
      } catch (recordErr) {
        setStage("failed");
        throw recordErr;
      }

      /* 3. UX toast */
      const explorer = getExplorerTxUrl(targetChainId, txHash);
      toast.success("NFT minted!", {
        description: (
          <a className="underline" href={explorer} target="_blank" rel="noreferrer">
            View transaction
          </a>
        ),
      });

      return { txHash, ...data };
    },

    onError(err) {
      console.error(err);
      setStage("failed");
      toast.error("Mint failed", { description: normalizeMintError(err) });
    },
  });

  /* Expose mutation + readiness flags */
  return {
    ...mutation,
    isReady,
    errorMsg,
    stage,
    stageLabel,
    walletControl,
    creatorReadiness,
  };
}
