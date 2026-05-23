// LinkWalletButton.tsx
import { useAccount, useSignMessage, useChainId, useEnsName } from "wagmi";
import { SiweMessage } from "siwe";
import { useRef, useState } from "react";
import { useWallets } from "../../hooks/useWalletAPI";
import { Buffer } from "buffer/";
import { api } from "../../lib/api";

if (typeof globalThis.Buffer === "undefined") {
  // @ts-expect-error browser polyfill
  globalThis.Buffer = Buffer;
}

export default function LinkWalletButton() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const ensQuery = useEnsName({
    address,
    chainId: 1,
    query: { enabled: !!address && chainId === 1 },
  });

  const { add } = useWallets();

  const nonceRef = useRef<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "sig" | "posting" | "linked" | "error"
  >("idle");

  if (!isConnected || !address) return null;

  const link = async () => {
    try {
      if (nonceRef.current) return;
      setStatus("sig");

      const { data } = await api.post("/wallets/nonce");
      nonceRef.current = data.nonce as string;

      const siwe = new SiweMessage({
        domain: window.location.hostname,
        address,
        statement: "Link wallet to TheBlueMaroon",
        uri: window.location.origin,
        version: "1",
        chainId,
        nonce: nonceRef.current,
        issuedAt: new Date().toISOString(),
      });
      const message = siwe.prepareMessage();

      const signature = await signMessageAsync({ message });

      if (!chainId) throw new Error("Missing chain id");

      setStatus("posting");

      await add.mutateAsync({
        address,
        signature,
        message,
        nonce: nonceRef.current,
        chain_id: chainId,
        ens_name: ensQuery.data ?? null,
      });

      setStatus("linked");
    } catch (e) {
      console.error("Wallet link failed with:", e);
      setStatus("error");
    } finally {
      nonceRef.current = null;
    }
  };

  return (
    <button
      disabled={status !== "idle"}
      onClick={link}
      className="rounded bg-brand-500 px-4 py-2 text-white disabled:opacity-50"
    >
      {status === "linked" ? "Wallet linked" : "Link wallet to account"}
    </button>
  );
}
