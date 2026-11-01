import type { Abi, Address, TransactionReceipt } from "viem";
import { decodeEventLog, getAddress, zeroAddress } from "viem";

import NFT_ABI from "../abi/BluemaroonNFT.json";

export type MintStage =
  | "idle"
  | "uploading_metadata"
  | "opening_wallet"
  | "submitted"
  | "confirming"
  | "bookkeeping"
  | "mined"
  | "failed";

export const mintStageLabels: Record<MintStage, string> = {
  idle: "Mint NFT",
  uploading_metadata: "Uploading metadata...",
  opening_wallet: "Minting...",
  submitted: "Transaction submitted...",
  confirming: "Waiting for confirmation...",
  bookkeeping: "Recording mint...",
  mined: "Minted",
  failed: "Mint failed",
};

const nftAbi = NFT_ABI as Abi;

export function getExplorerTxUrl(chainId: number, txHash: string): string {
  if (chainId === 11155111) {
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  }

  return `https://etherscan.io/tx/${txHash}`;
}

export function extractMintedTokenId(
  receipt: TransactionReceipt,
  nftAddress: Address,
  ownerAddress?: Address,
): bigint | null {
  const normalizedNftAddress = getAddress(nftAddress);
  const normalizedOwnerAddress = ownerAddress ? getAddress(ownerAddress) : null;

  for (const log of receipt.logs) {
    if (getAddress(log.address) !== normalizedNftAddress) {
      continue;
    }

    try {
      const decoded = decodeEventLog({
        abi: nftAbi,
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName !== "Transfer") {
        continue;
      }

      const args = decoded.args as unknown as {
        from: Address;
        to: Address;
        tokenId: bigint;
      };

      if (getAddress(args.from) !== zeroAddress) {
        continue;
      }

      if (normalizedOwnerAddress && getAddress(args.to) !== normalizedOwnerAddress) {
        continue;
      }

      return args.tokenId;
    } catch {
      continue;
    }
  }

  return null;
}
