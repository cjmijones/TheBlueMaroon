import { useCallback, useRef, useState } from "react";
import { SiweMessage } from "siwe";
import { getAddress } from "viem";
import { useAccount, useChainId, useEnsName, useSignMessage } from "wagmi";
import { Buffer } from "buffer/";
import { api } from "../lib/api";
import { useWallets } from "./useWalletAPI";

if (typeof globalThis.Buffer === "undefined") {
  // @ts-expect-error browser polyfill
  globalThis.Buffer = Buffer;
}

export type LinkWalletStatus = "idle" | "signing" | "posting" | "linked" | "error";

function responseDetail(error: unknown) {
  const maybeAxios = error as { response?: { data?: { detail?: string } } };
  return maybeAxios.response?.data?.detail;
}

function linkErrorMessage(error: unknown) {
  const maybeError = error as { code?: number; message?: string };
  const text = [maybeError.message, responseDetail(error)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (maybeError.code === 4001 || text.includes("user rejected") || text.includes("rejected")) {
    return "The signature request was rejected. Try linking again when ready.";
  }
  if (text.includes("nonce not found") || text.includes("expired") || text.includes("already used")) {
    return "The link request expired. Try again to create a fresh signature request.";
  }
  if (text.includes("unsupported chain")) {
    return "This network is not supported for wallet linking. Switch to Sepolia or Mainnet.";
  }
  if (text.includes("already linked to another user")) {
    return "This wallet is already linked to another account.";
  }
  if (text.includes("invalid message") || text.includes("siwe")) {
    return "The wallet signature message could not be prepared. Refresh and try again.";
  }
  if (text.includes("network") || text.includes("failed to fetch")) {
    return "The wallet link service could not be reached. Check the backend and try again.";
  }
  return "Wallet link failed. Check your wallet, network, and login state before trying again.";
}

export function useLinkWallet() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const { add } = useWallets();
  const nonceRef = useRef<string | null>(null);
  const [status, setStatus] = useState<LinkWalletStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const ensQuery = useEnsName({
    address,
    chainId: 1,
    query: { enabled: Boolean(address) && chainId === 1 },
  });

  const linkWallet = useCallback(async () => {
    if (!isConnected || !address) {
      setStatus("error");
      setErrorMessage("Connect a browser wallet before linking it to your account.");
      return;
    }
    if (!chainId) {
      setStatus("error");
      setErrorMessage("Your wallet network could not be detected. Reconnect your wallet and try again.");
      return;
    }
    if (nonceRef.current) return;

    try {
      setStatus("signing");
      setErrorMessage(null);

      const checksumAddress = getAddress(address);
      const { data } = await api.post("/wallets/nonce");
      nonceRef.current = data.nonce as string;

      const siwe = new SiweMessage({
        domain: window.location.hostname,
        address: checksumAddress,
        statement: "Link wallet to TheBlueMaroon",
        uri: window.location.origin,
        version: "1",
        chainId,
        nonce: nonceRef.current,
        issuedAt: new Date().toISOString(),
      });
      const message = siwe.prepareMessage();
      const signature = await signMessageAsync({ message });

      setStatus("posting");

      await add.mutateAsync({
        address: checksumAddress,
        signature,
        message,
        nonce: nonceRef.current,
        chain_id: chainId,
        ens_name: ensQuery.data ?? null,
      });

      setStatus("linked");
    } catch (error) {
      console.error("Wallet link failed with:", error);
      setStatus("error");
      setErrorMessage(linkErrorMessage(error));
    } finally {
      nonceRef.current = null;
    }
  }, [add, address, chainId, ensQuery.data, isConnected, signMessageAsync]);

  const reset = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
  }, []);

  return {
    linkWallet,
    reset,
    status,
    errorMessage,
    isPending: status === "signing" || status === "posting",
    isLinked: status === "linked",
  };
}
