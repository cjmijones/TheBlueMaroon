import { useState } from "react";
import {
  useAccountModal,
  useChainModal,
  useConnectModal,
} from "@rainbow-me/rainbowkit";
import { useDisconnect } from "wagmi";
import Button from "../ui/button/Button";
import Badge from "../ui/badge/Badge";
import LinkWalletButton from "../wallet/LinkWalletButton";
import { useWallets } from "../../hooks/useWalletAPI";
import {
  chainLabel,
  isSameAddress,
  shortAddress,
  useWalletControlState,
} from "../../hooks/useWalletControlState";

export default function WalletControlPanel() {
  const walletState = useWalletControlState();
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { openChainModal } = useChainModal();
  const { disconnect } = useDisconnect();
  const { remove } = useWallets();
  const [linkError, setLinkError] = useState<string | null>(null);

  const showLinkButton =
    walletState.status === "connected_not_linked" ||
    walletState.status === "connected_different_wallet";

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase text-gray-500 dark:text-gray-400">
            Wallet control
          </p>
          <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
            {walletState.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            {walletState.message}
          </p>
          {linkError && (
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              {linkError}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {walletState.status === "not_connected" && (
            <Button size="sm" onClick={() => openConnectModal?.()}>
              Connect wallet
            </Button>
          )}
          {walletState.status === "wrong_chain" && (
            <Button size="sm" onClick={() => openChainModal?.()}>
              Switch network
            </Button>
          )}
          {showLinkButton && (
            <LinkWalletButton
              onLinked={() => setLinkError(null)}
              onError={setLinkError}
            />
          )}
          {walletState.address && (
            <Button size="sm" variant="outline" onClick={() => openAccountModal?.()}>
              Wallet details
            </Button>
          )}
          {walletState.address && (
            <Button size="sm" variant="outline" onClick={() => disconnect()}>
              Disconnect browser
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <p className="text-sm font-medium text-gray-800 dark:text-white">
            Browser wallet
          </p>
          <p className="mt-2 font-mono text-sm text-gray-700 dark:text-gray-300">
            {walletState.address ? shortAddress(walletState.address) : "Not connected"}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {chainLabel(walletState.chainId)}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <p className="text-sm font-medium text-gray-800 dark:text-white">
            Creator actions
          </p>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            {walletState.creatorActionsAllowed
              ? "Minting and fractionalization are enabled for this linked wallet."
              : "Link the connected wallet to this account before minting or fractionalizing."}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
            Linked wallets
          </h3>
          <Badge size="sm" color={walletState.hasLinkedWallets ? "success" : "warning"}>
            {walletState.linkedWallets.length.toString()}
          </Badge>
        </div>

        {walletState.linkedWallets.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            No wallets are linked to this account yet.
          </p>
        ) : (
          <div className="space-y-3">
            {walletState.linkedWallets.map((wallet) => (
              <div
                key={wallet.address}
                className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-mono text-sm text-gray-800 dark:text-white">
                    {wallet.ens_name || shortAddress(wallet.address)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {chainLabel(wallet.chain_id)}
                    {wallet.is_primary ? " · Primary" : ""}
                    {isSameAddress(walletState.matchingWallet?.address, wallet.address) ? " · Current" : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(wallet.address)}
                >
                  Unlink
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
