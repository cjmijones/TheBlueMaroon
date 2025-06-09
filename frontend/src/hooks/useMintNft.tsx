import { useMutation } from "@tanstack/react-query";
import { useWriteContract } from "wagmi";
import { api } from "../lib/api";       // shared axios instance
import NFT_ABI from "../abi/BluemaroonNFT.json";

/**
 * Upload metadata → mint NFT on chain.
 * Contract signature:  mint(string tokenURI)
 */
export function useMintNft() {
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    mutationFn: async (form: FormData) => {
      /* 1️⃣  POST image + meta to FastAPI */
      const { data } = await api.post("/nfts/metadata", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      /* 2️⃣  User signs on-chain mint (Sepolia in dev) */
      console.log("Attempting to mint NFT with token URI:", data.token_uri);

      try {
        const tx = await writeContractAsync({
          abi: NFT_ABI,
          address: import.meta.env.VITE_NFT_ADDRESS as `0x${string}`,
          functionName: "mint",
          args: [data.token_uri],
          chainId: 11155111,            // dev default – ChainContext can override
        });
        console.log("NFT mint transaction successful:", tx);
      } catch (error) {
        console.error("NFT mint transaction failed:", error);
        throw error;
      }
    },
  });
}
