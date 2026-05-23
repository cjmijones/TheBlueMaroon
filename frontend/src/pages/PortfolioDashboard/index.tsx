// src/pages/PortfolioDashboard/index.tsx
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Link } from "react-router-dom";
import { useAccount, useChainId } from "wagmi";
import { CreatedAsset, usePortfolio } from "../../hooks/usePortfolio";
import EmptyState from "../../components/ui/empty/EmptyState";
import Button from "../../components/ui/button/Button";
import LinkWalletButton from "../../components/wallet/LinkWalletButton";
import { useChain } from "../../context/ChainContext";

function formatEth(nativeWei?: string | null) {
  if (!nativeWei) return "0.0000";
  const wei = BigInt(nativeWei);
  const whole = wei / 10n ** 18n;
  const fraction = (wei % 10n ** 18n).toString().padStart(18, "0").slice(0, 4);
  return `${whole}.${fraction}`;
}

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function PortfolioDashboard() {
  const { address, isConnected } = useAccount();
  const walletChainId = useChainId();
  const appDefaultChainId = useChain();
  const effectiveChainId = walletChainId ?? appDefaultChainId;
  const { openConnectModal } = useConnectModal();
  const { data, isLoading, error } = usePortfolio(address, effectiveChainId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 h-36 animate-pulse rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800" />
        <div className="col-span-12 h-80 animate-pulse rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        title="Portfolio unavailable"
        body="The portfolio endpoint could not be loaded. Check the backend and wallet service logs."
      />
    );
  }

  const primaryWallet =
    data.wallets.find((wallet) => wallet.is_connected) ??
    data.wallets.find((wallet) => wallet.is_primary) ??
    data.wallets[0];
  const connectedPortfolioWallet = data.wallets.find((wallet) => wallet.is_connected);
  const linkedWalletCount = data.wallets.filter((wallet) => wallet.is_linked).length;
  const totalSepoliaEth = data.wallets
    .filter((wallet) => wallet.chain_id === 11155111)
    .reduce((sum, wallet) => sum + BigInt(wallet.balances?.native_wei ?? "0"), 0n);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Metric label="Linked wallets" value={linkedWalletCount.toString()} />
        <Metric label="Owned NFTs" value={data.lifecycle_counts.owned_nfts.toString()} />
        <Metric label="Creator pipeline" value={data.lifecycle_counts.draft_assets.toString()} />
        <Metric label="Sepolia ETH" value={formatEth(totalSepoliaEth.toString())} />
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <section className="col-span-12 rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] lg:col-span-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Wallet Control
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Current wallet identity and balances.
              </p>
            </div>
            {!isConnected ? (
              <Button size="sm" onClick={() => openConnectModal?.()}>
                Connect
              </Button>
            ) : connectedPortfolioWallet?.is_linked ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                Linked
              </span>
            ) : (
              <LinkWalletButton />
            )}
          </div>

          <div className="mt-5 space-y-3">
            {data.wallets.length === 0 ? (
              <EmptyState
                title="No wallets linked"
                body="Connect and link a wallet before preparing assets for launch."
              />
            ) : (
              data.wallets.map((wallet) => (
                <div
                  key={`${wallet.chain_id}-${wallet.address}`}
                  className="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm text-gray-800 dark:text-white">
                        {wallet.ens_name || truncateAddress(wallet.address)}
                      </p>
                      <p className="mt-1 text-xs uppercase text-gray-500 dark:text-gray-400">
                        {wallet.chain_name}
                        {wallet.is_connected ? " Connected" : ""}
                        {wallet.is_primary ? " Primary" : ""}
                        {!wallet.is_linked ? " Not linked" : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      {formatEth(wallet.balances?.native_wei)} {wallet.native_symbol}
                    </span>
                  </div>
                  {wallet.errors.length > 0 && (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      Some wallet data could not be refreshed.
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="col-span-12 rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] lg:col-span-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Asset Pipeline
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Owned NFTs, drafts, and launched fractional rounds.
              </p>
            </div>
            {primaryWallet && (
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                {truncateAddress(primaryWallet.address)}
              </span>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <AssetList
              title="Owned NFTs"
              emptyTitle="No owned NFTs found"
              emptyBody="Alchemy did not return NFTs for the linked wallet on the selected chain."
              assets={data.owned_assets}
            />
            <CreatedAssetList assets={data.created_assets} />
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Fractional Positions
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Fractional token holdings and sale proceeds.
        </p>
        <div className="mt-5">
          <EmptyState
            title="No fractional positions yet"
            body="Future purchases and creator-retained shares will appear here."
          />
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function AssetList({
  title,
  emptyTitle,
  emptyBody,
  assets,
}: {
  title: string;
  emptyTitle: string;
  emptyBody: string;
  assets: Array<{
    contract: string;
    tokenId: string;
    title?: string;
    image?: string | null;
    chain_name?: string;
  }>;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-800 dark:text-white">{title}</h3>
      <div className="mt-3 space-y-3">
        {assets.length === 0 ? (
          <EmptyState title={emptyTitle} body={emptyBody} />
        ) : (
          assets.slice(0, 6).map((asset) => (
            <div
              key={`${asset.contract}-${asset.tokenId}`}
              className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
                {asset.image && (
                  <img src={asset.image} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {asset.title || `Token ${asset.tokenId}`}
                </p>
                <p className="mt-1 truncate font-mono text-xs text-gray-500 dark:text-gray-400">
                  {asset.chain_name} {truncateAddress(asset.contract)} #{asset.tokenId}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CreatedAssetList({ assets }: { assets: CreatedAsset[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Creator Assets</h3>
      <div className="mt-3 space-y-3">
        {assets.length === 0 ? (
          <EmptyState
            title="No creator assets yet"
            body="Fractionalization drafts and launched rounds will appear here."
          />
        ) : (
          assets.map((asset) => (
            <div
              key={asset.id}
              className="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
                    {asset.image_url && (
                      <img src={asset.image_url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {asset.title || assetIdentity(asset)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {assetSummary(asset)}
                    </p>
                    {asset.tx_hash && (
                      <p className="mt-1 truncate font-mono text-xs text-gray-400 dark:text-gray-500">
                        {truncateAddress(asset.tx_hash)}
                      </p>
                    )}
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-xs capitalize text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {formatStatus(asset.status)}
                </span>
              </div>
              {asset.vault && (
                <Link
                  to={`/holding/${asset.id}`}
                  className="mt-2 inline-block text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  View market position
                </Link>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function assetIdentity(asset: CreatedAsset) {
  if (asset.nft_contract && asset.token_id) {
    return `${truncateAddress(asset.nft_contract)} #${asset.token_id}`;
  }
  return "Untitled asset";
}

function assetSummary(asset: CreatedAsset) {
  if (asset.shares != null) {
    return `${asset.shares.toLocaleString()} shares${
      asset.round_price ? ` at ${asset.round_price} ETH` : ""
    }`;
  }
  if (asset.nft_contract && asset.token_id) {
    return `${asset.chain_id ?? "Chain"} ${truncateAddress(asset.nft_contract)} #${asset.token_id}`;
  }
  if (asset.metadata_uri) {
    return "Metadata ready for minting";
  }
  return "Creator asset";
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}
