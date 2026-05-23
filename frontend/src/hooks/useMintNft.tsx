// src/hooks/useMintNft.ts
import { useMutation }      from "@tanstack/react-query";
import { useAccount,
         useChainId,
         useSwitchChain,
         useWriteContract } from "wagmi";
import { toast }            from "sonner";

import { api }              from "../lib/api";
import NFT_ABI              from "../abi/BluemaroonNFT.json";
import { CHAINS }           from "../lib/addresses";
import { useChain }         from "../context/ChainContext";

interface MintResp {
  asset_id: number;
  token_uri: string;
  image_url: string;
}

export function useMintNft() {
  /* Wallet & network ---------------------------------------------- */
  const { address, isConnected } = useAccount();
  const chainId                = useChainId();
  const { switchChainAsync }   = useSwitchChain();
  const ctxChainId             = useChain();          // default from <ChainContext>
  const targetChainId          = chainId ?? ctxChainId ?? 1;

  /* Chain config lookup ------------------------------------------- */
  const chainCfg   = CHAINS[targetChainId as keyof typeof CHAINS];
  const nftAddress = chainCfg?.nft;

  /* Compose readiness / error state ------------------------------- */
  let errorMsg: string | null = null;
  if (!isConnected) {
    errorMsg = "Connect your wallet first.";
  } else if (!chainCfg) {
    errorMsg = `Unsupported chain (${targetChainId}). Switch to Sepolia or Mainnet.`;
  } else if (!nftAddress) {
    errorMsg = `NFT contract address missing for chain ${targetChainId}.`;
  }

  const isReady = errorMsg === null;
  const { writeContractAsync } = useWriteContract();

  /* Mutation ------------------------------------------------------- */
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      if (!isReady) throw new Error(errorMsg!);

      /* Ensure wallet on correct network */
      if (chainId && chainId !== targetChainId && switchChainAsync) {
        await switchChainAsync({ chainId: targetChainId });
      }

      form.set("chain_id", String(targetChainId));
      form.set("nft_contract", nftAddress!);
      if (address) form.set("owner_wallet_address", address);

      /* 1. Upload metadata */
      const { data } = await api.post<MintResp>("/nfts/metadata", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      /* 2. Mint */
      const txHash = await writeContractAsync({
        abi:          NFT_ABI,
        address:      nftAddress!,            // safe because isReady === true
        functionName: "mint",
        args:         [data.token_uri],
        chainId:      targetChainId,
      });

      try {
        await api.post("/transactions/", {
          hash: txHash,
          wallet_address: address,
          chain_id: targetChainId,
          method: "mint_nft",
          status: "submitted",
          payload_json: {
            asset_id: data.asset_id,
            nft_contract: nftAddress,
            token_uri: data.token_uri,
            image_url: data.image_url,
          },
        });

        await api.patch(`/nfts/assets/${data.asset_id}/minted`, {
          tx_hash: txHash,
          owner_wallet_address: address,
          chain_id: targetChainId,
          nft_contract: nftAddress,
        });
      } catch (recordErr) {
        console.warn("Mint submitted, but app bookkeeping failed", recordErr);
        toast.warning("Mint submitted, but app history was not updated.");
      }

      /* 3. UX toast */
      const explorer = targetChainId === 11155111
        ? "https://sepolia.etherscan.io/tx/"
        : "https://etherscan.io/tx/";
      toast.success("NFT minted!", {
        description: (
          <a className="underline" href={explorer + txHash} target="_blank">
            View on Etherscan
          </a>
        ),
      });

      return { txHash, ...data };
    },

    onError(err) {
      console.error(err);
      toast.error("Mint failed", { description: String(err) });
    },
  });

  /* Expose mutation + readiness flags */
  return {
    ...mutation,
    isReady,
    errorMsg,
  };
}
