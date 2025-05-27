// src/components/LinkWalletButton.tsx
import { useAccount, useSignMessage } from 'wagmi';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import { useState } from 'react';

export default function LinkWalletButton() {
  const { isConnected, address } = useAccount();
  const { getAccessTokenSilently } = useAuth0();
  const [status, setStatus] = useState<'idle' | 'sig' | 'posting' | 'linked'>(
    'idle'
  );
  const { signMessageAsync } = useSignMessage();

  if (!isConnected || !address) return null; // wallet not connected

  const link = async () => {
    const token = await getAccessTokenSilently(); // Auth0 JWT
    setStatus('sig');
    // 1. ask backend for a nonce
    const { data } = await axios.post(
      '/api/nonce',
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const message = `Sign this nonce: ${data.nonce}`;
    // 2. have wallet sign the nonce
    const signature = await signMessageAsync({ message });

    setStatus('posting');
    // 3. send signed payload to backend
    await axios.post(
      '/api/link-wallet',
      { address, signature, nonce: data.nonce },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setStatus('linked');
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
