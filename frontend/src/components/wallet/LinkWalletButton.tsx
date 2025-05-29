// LinkWalletButton.tsx
import { useAccount, useSignMessage, useChainId, useEnsName } from 'wagmi';
import { useAuth0 } from '@auth0/auth0-react';
import { SiweMessage } from 'siwe';
import axios from 'axios';
import { useRef, useState } from 'react';
import { useWallets } from '../../hooks/useWalletAPI';
import { Buffer } from 'buffer/';                 // polyfill

if (typeof globalThis.Buffer === 'undefined') {
  // @ts-expect-error browser polyfill
  globalThis.Buffer = Buffer;
}

const apiBaseURL =
  import.meta.env.VITE_ENV_TYPE === 'prod'
    ? `${import.meta.env.VITE_API_PROD_URL}/api`
    : `${import.meta.env.VITE_API_DEV_URL}/api`;

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

  /* ── Auth0 + wallet API hook ─────────────── */
  const { getAccessTokenSilently } = useAuth0();
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

      /* 1️⃣  Auth0 token */
      const token = await getAccessTokenSilently();
      if (!token) throw new Error('Missing Auth0 token');

      /* 2️⃣  nonce from server (re-use if still set) */
      const { data } = await axios.post(
        `${apiBaseURL}/wallets/nonce`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
