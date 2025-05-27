import { useWallets } from "../../hooks/useWalletAPI";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useSignMessage } from "wagmi";
import Button from "../ui/button/Button";

export default function WalletCard() {
  const { list, add, remove } = useWallets();
  const { openConnectModal } = useConnectModal();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const handleConnect = async () => {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }
    const message = `Link wallet to BlueMaroon at ${Date.now()}`;
    const signature = await signMessageAsync({ message });
    if (!address) return;
    add.mutate({ address, signature, message });
  };

  return (
    <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Connected Wallets
          </h4>
          <Button size="sm" onClick={handleConnect} disabled={add.isPending}>
            {isConnected ? "Link Current Wallet" : "Connect Wallet"}
          </Button>
        </div>

        {list.isLoading && <p>Loading...</p>}
        {list.data && list.data.length === 0 && <p>No wallets linked yet.</p>}
        {Array.isArray(list.data) ? (
          list.data.length === 0 ? (
            <p>No wallets linked yet.</p>
          ) : (
            list.data.map((w) => (
              <div
                key={w.address}
                className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3"
              >
                <span className="font-mono text-sm">{w.address}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => remove.mutate(w.address)}
                  disabled={remove.isPending}
                >
                  Disconnect
                </Button>
              </div>
            ))
          )
        ) : (
          <p className="text-red-500">Failed to load wallets.</p>
        )}
      </div>
    </div>
  );
}
