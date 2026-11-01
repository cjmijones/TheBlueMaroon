import type { Address, TransactionReceipt, Abi } from "viem";
import { decodeEventLog, getAddress } from "viem";

import VAULT_FACTORY_ABI from "../abi/VaultFactory.json";

export type FractionalizeStage =
  | "idle"
  | "checking_vault"
  | "approving_nft"
  | "approval_submitted"
  | "approval_confirmed"
  | "creating_draft"
  | "opening_wallet"
  | "vault_submitted"
  | "confirming_vault"
  | "finalizing_listing"
  | "active"
  | "failed";

export const fractionalizeStageLabels: Record<FractionalizeStage, string> = {
  idle: "Create vault",
  checking_vault: "Checking vault...",
  approving_nft: "Approving NFT...",
  approval_submitted: "Approval submitted...",
  approval_confirmed: "Approval confirmed...",
  creating_draft: "Creating draft...",
  opening_wallet: "Creating vault...",
  vault_submitted: "Vault transaction submitted...",
  confirming_vault: "Confirming vault...",
  finalizing_listing: "Finalizing listing...",
  active: "Vault active",
  failed: "Fractionalization failed",
};

const vaultFactoryAbi = VAULT_FACTORY_ABI as Abi;

export function getExplorerTxUrl(chainId: number, txHash: string): string {
  if (chainId === 11155111) {
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  }

  return `https://etherscan.io/tx/${txHash}`;
}

export function getExplorerAddressUrl(chainId: number, address: string): string {
  if (chainId === 11155111) {
    return `https://sepolia.etherscan.io/address/${address}`;
  }

  return `https://etherscan.io/address/${address}`;
}

export function extractVaultCreatedAddress(
  receipt: TransactionReceipt,
  factoryAddress: Address,
  predictedVault: Address,
): Address {
  const normalizedFactory = getAddress(factoryAddress);

  for (const log of receipt.logs) {
    if (getAddress(log.address) !== normalizedFactory) {
      continue;
    }

    try {
      const decoded = decodeEventLog({
        abi: vaultFactoryAbi,
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName !== "VaultCreated") {
        continue;
      }

      const args = decoded.args as unknown as {
        vault: Address;
      };

      return getAddress(args.vault);
    } catch {
      continue;
    }
  }

  return getAddress(predictedVault);
}
