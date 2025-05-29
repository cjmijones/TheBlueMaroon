import { useWallets } from '../../hooks/useWalletAPI';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import Button from '../ui/button/Button';
import LinkWalletButton from '../wallet/LinkWalletButton'; // ✅ Make sure path is correct

export default function WalletCard() {
  const { list, remove } = useWallets();
  const { openConnectModal } = useConnectModal();
  const { isConnected } = useAccount();

  return (
    <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Connected Wallets
          </h4>

          {/* ✅ Render link button or connect modal button */}
          {isConnected ? (
            <LinkWalletButton />
          ) : (
            <Button size="sm" onClick={() => openConnectModal?.()}>
              Connect Wallet
            </Button>
          )}
        </div>

        {/* Wallet list */}
        {list.isLoading && <p>Loading…</p>}
        {list.error && <p className="text-red-500">Failed to load wallets.</p>}
        {Array.isArray(list.data) && list.data.length === 0 && <p>No wallets linked yet.</p>}

        {Array.isArray(list.data) &&
          list.data.map((w) => (
            <div
              key={w.address}
              className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3"
            >
              <span className="font-mono text-sm">
                {w.ens_name ?? w.address}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => remove.mutate(w.address)}
                disabled={remove.isPending}
              >
                Disconnect
              </Button>
            </div>
          ))}
      </div>
    </div>
  );
}
