// LinkWalletButton.tsx
import { useAccount, useSignMessage, useChainId, useEnsName } from 'wagmi';
import { SiweMessage } from 'siwe';
import { useRef, useState } from 'react';
import { useWallets } from '../../hooks/useWalletAPI';
import { Buffer } from 'buffer/';                 // polyfill
import { api } from '../../lib/api';
import { useSupabaseAuth } from '../../providers/SupabaseAuthProvider';

if (typeof globalThis.Buffer === 'undefined') {
  // @ts-expect-error browser polyfill
  globalThis.Buffer = Buffer;
}

export default function LinkWalletButton() {
  /* ── wagmi + ENS ─────────────────────────── */
  const { isConnected, address } = useAccount();
  const chainId                  = useChainId();
  const { signMessageAsync }     = useSignMessage();
  const ensQuery                 = useEnsName({
    address,
    chainId : 1,
    query   : { enabled: !!address && chainId === 1 },
  });

  /* ── Supabase + wallet API hook ─────────────── */
  const { getAccessToken } = useSupabaseAuth();
  const { add }                    = useWallets();     // we will use mutateAsync ⬇

  /* ── local state ─────────────────────────── */
  const nonceRef = useRef<string | null>(null);
  const [status, setStatus] = useState<
    'idle' | 'sig' | 'posting' | 'linked' | 'error'
  >('idle');

  if (!isConnected || !address) return null;

  /* ── click handler ───────────────────────── */
  const link = async () => {
    try {
      if (nonceRef.current) return;        // guard: already in-flight
      setStatus('sig');

      /* 1️⃣  Supabase access token */
      const token = await getAccessToken();
      if (!token) throw new Error('Missing Supabase access token');

      /* 2️⃣  nonce from server (re-use if still set) */
      const { data } = await api.post("/wallets/nonce", {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      nonceRef.current = data.nonce as string;

      /* 3️⃣  build SIWE message */
      const siwe = new SiweMessage({
        domain   : window.location.hostname,
        address,
        statement: 'Link wallet to TheBlueMaroon',
        uri      : window.location.origin,
        version  : '1',
        chainId,
        nonce    : nonceRef.current,
        issuedAt : new Date().toISOString(),
      });
      const message = siwe.prepareMessage();

      /* 4️⃣  let the user sign */
      const signature = await signMessageAsync({ message });

      /* 5️⃣  POST /wallets */
      if (!chainId) throw new Error('Missing chain id');

      setStatus('posting');

      /**  🔑  WAIT for the mutation to finish  */
      await add.mutateAsync({
        address,
        signature,
        message,
        nonce    : nonceRef.current,
        chain_id : chainId,
        ens_name : ensQuery.data ?? null,
      });

      setStatus('linked');
    } catch (e) {
      console.error('🔴 Wallet link failed with:', e);
      setStatus('error');
    } finally {
      /** Always clear the local nonce AFTER the request settled */
      nonceRef.current = null;
    }
  };

  return (
    <button
      disabled={status !== 'idle'}
      onClick={link}
      className="rounded bg-brand-500 px-4 py-2 text-white disabled:opacity-50"
    >
      {status === 'linked' ? 'Wallet linked ✅' : 'Link wallet to account'}
    </button>
  );
}
