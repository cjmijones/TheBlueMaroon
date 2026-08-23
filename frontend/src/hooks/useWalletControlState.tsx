import { useMemo } from "react";
import { useAccount, useChainId } from "wagmi";
import { CHAINS } from "../lib/addresses";
import { useWallets } from "./useWalletAPI";

export type WalletControlStatus =
  | "loading"
  | "not_connected"
  | "wrong_chain"
  | "linked_ready"
  | "connected_not_linked"
  | "connected_different_wallet";

export type WalletControlWallet = {
  address: string;
  chain_id: number;
  ens_name?: string | null;
  is_primary: boolean;
  linked_at: string;
};

export type WalletControlState = {
  status: WalletControlStatus;
  address?: `0x${string}`;
  chainId?: number;
  linkedWallets: WalletControlWallet[];
  matchingWallet?: WalletControlWallet;
  hasLinkedWallets: boolean;
  isSupportedChain: boolean;
  creatorActionsAllowed: boolean;
  title: string;
  message: string;
  actionLabel: string;
};

export function isSameAddress(left?: string | null, right?: string | null) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

export function shortAddress(address?: string | null) {
  if (!address) return "Unknown wallet";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function chainLabel(chainId?: number | null) {
  if (chainId === 11155111) return "Sepolia";
  if (chainId === 1) return "Mainnet";
  if (chainId == null) return "Unknown chain";
  return `Chain ${chainId}`;
}

function isConfiguredChain(chainId?: number) {
  return Boolean(chainId && CHAINS[chainId as keyof typeof CHAINS]);
}

export function useWalletControlState(): WalletControlState {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { list } = useWallets();

  return useMemo(() => {
    const linkedWallets = (list.data ?? []) as WalletControlWallet[];
    const hasLinkedWallets = linkedWallets.length > 0;
    const matchingWallet = linkedWallets.find((wallet) =>
      isSameAddress(wallet.address, address),
    );
    const isSupportedChain = isConfiguredChain(chainId);

    if (list.isLoading) {
      return {
        status: "loading",
        address,
        chainId,
        linkedWallets,
        matchingWallet,
        hasLinkedWallets,
        isSupportedChain,
        creatorActionsAllowed: false,
        title: "Checking wallet status",
        message: "Looking up linked wallets for this account.",
        actionLabel: "Checking",
      };
    }

    if (!isConnected || !address) {
      return {
        status: "not_connected",
        address,
        chainId,
        linkedWallets,
        matchingWallet,
        hasLinkedWallets,
        isSupportedChain,
        creatorActionsAllowed: false,
        title: "Connect a wallet",
        message: "Connect MetaMask or another wallet to manage creator actions.",
        actionLabel: "Connect wallet",
      };
    }

    if (!isSupportedChain) {
      return {
        status: "wrong_chain",
        address,
        chainId,
        linkedWallets,
        matchingWallet,
        hasLinkedWallets,
        isSupportedChain,
        creatorActionsAllowed: false,
        title: "Switch networks",
        message: `${shortAddress(address)} is connected on ${chainLabel(chainId)}. Switch to Sepolia or Mainnet to continue.`,
        actionLabel: "Switch network",
      };
    }

    if (matchingWallet) {
      return {
        status: "linked_ready",
        address,
        chainId,
        linkedWallets,
        matchingWallet,
        hasLinkedWallets,
        isSupportedChain,
        creatorActionsAllowed: true,
        title: "Wallet ready",
        message: `${shortAddress(address)} is connected, linked, and ready on ${chainLabel(chainId)}.`,
        actionLabel: "Ready",
      };
    }

    if (hasLinkedWallets) {
      return {
        status: "connected_different_wallet",
        address,
        chainId,
        linkedWallets,
        matchingWallet,
        hasLinkedWallets,
        isSupportedChain,
        creatorActionsAllowed: false,
        title: "Connected wallet is not linked",
        message: `${shortAddress(address)} is connected in your browser, but your account is linked to a different wallet. Switch wallets or link this one.`,
        actionLabel: "Link this wallet",
      };
    }

    return {
      status: "connected_not_linked",
      address,
      chainId,
      linkedWallets,
      matchingWallet,
      hasLinkedWallets,
      isSupportedChain,
      creatorActionsAllowed: false,
      title: "Link this wallet",
      message: `${shortAddress(address)} is connected in your browser, but it is not linked to your Blue Maroon account yet.`,
      actionLabel: "Link wallet",
    };
  }, [address, chainId, isConnected, list.data, list.isLoading]);
}
