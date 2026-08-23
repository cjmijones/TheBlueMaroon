import { Link, useParams } from "react-router-dom";
import type { ReactNode } from "react";

import { usePosition } from "../../hooks/usePosition";
import { MarketDepthCard } from "../../components/OrderMarket/MarketDepthCard";
import { OpenOrdersTable } from "../../components/OrderMarket/OpenOrdersTable";
import Button from "../../components/ui/button/Button";
import EmptyState from "../../components/ui/empty/EmptyState";

export default function HoldingDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { data: position, isLoading, error } = usePosition(id);

  if (isLoading) {
    return (
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="h-80 animate-pulse rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800 xl:col-span-2" />
        <div className="h-80 animate-pulse rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Holding unavailable"
        body="The portfolio endpoint could not be loaded. Check the backend service and try again."
      />
    );
  }

  if (!position) {
    return (
      <EmptyState
        title="Launched asset not found"
        body="This page only shows creator assets that have a finalized fractional vault."
      />
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <section className="space-y-6 xl:col-span-2">
        <header className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
              {position.image_url && (
                <img
                  src={position.image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {position.title}
                  </h2>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Finalized creator asset with a recorded fractional vault.
                  </p>
                </div>
                <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs capitalize text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {formatStatus(position.status)}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Fact label="Share supply" value={formatNullableNumber(position.shares)} />
                <Fact label="Round price" value={position.round_price ? `${position.round_price} ETH` : "Not recorded"} />
                <Fact label="Vault" value={position.vault ? truncateAddress(position.vault) : "Not recorded"} />
                <Fact label="Chain" value={position.chain_id ?? "Not recorded"} />
                <Fact label="NFT contract" value={position.nft_contract ? truncateAddress(position.nft_contract) : "Not recorded"} />
                <Fact label="Token ID" value={position.token_id ?? "Not recorded"} />
              </div>

              {position.tx_hash && (
                <p className="mt-4 truncate font-mono text-xs text-gray-500 dark:text-gray-400">
                  Transaction: {position.tx_hash}
                </p>
              )}
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <CapabilityPanel
            title="Trading unavailable"
            body="Sell orders and quote previews need live marketplace pricing, order routes, and settlement before they should be shown."
          />
          <CapabilityPanel
            title="Withdrawals unavailable"
            body="Withdrawable proceeds are hidden until the backend exposes a real balance source for settled sales."
          />
          <CapabilityPanel
            title="NAV unavailable"
            body="Portfolio value is not calculated until a price source is connected for fractional shares."
          />
          <CapabilityPanel
            title="Share ownership pending"
            body="Creator-retained and purchased share balances need a database-backed position model before they appear here."
          />
        </section>

        <Link to="/portfolio" className="inline-flex">
          <Button size="sm" variant="outline">
            Back to portfolio
          </Button>
        </Link>
      </section>

      <aside className="space-y-6">
        <MarketDepthCard assetId={position.id} />
        <OpenOrdersTable assetId={position.id} />
      </aside>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
      <p className="text-xs uppercase text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function CapabilityPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{body}</p>
    </div>
  );
}

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

function formatNullableNumber(value: number | null) {
  return value == null ? "Not recorded" : value.toLocaleString();
}
