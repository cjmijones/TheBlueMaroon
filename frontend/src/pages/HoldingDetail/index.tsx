/* --------------------------------------------------------------
   pages/HoldingDetail/index.tsx   (FINAL, unified version)
-------------------------------------------------------------- */
import { useParams } from "react-router-dom";
import { useState }   from "react";

import { usePosition } from "../../hooks/usePosition";
import { useWithdrawable } from "../../hooks/useWithdrawable";

import PositionValueChart from "../../components/Portfolio/PositionValueChart";
import { SellButton } from "../../components/Portfolio/SellButton";
import { SellModal } from "../../components/SellModal";
import { WithdrawModal } from "../../components/WithdrawModal";
import { MarketDepthCard } from "../../components/OrderMarket/MarketDepthCard";
import { OpenOrdersTable } from "../../components/OrderMarket/OpenOrdersTable";
import Button from "../../components/ui/button/Button";
import EmptyState from "../../components/ui/empty/EmptyState";

export default function HoldingDetailPage() {
  const { id = "" } = useParams<{ id: string }>();

  /* data hooks (mock today, real API tomorrow) */
  const { data: position, isLoading }   = usePosition(id);
  const { data: withdrawable }          = useWithdrawable();

  /* modal state */
  const [sellOpen,     setSellOpen]     = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  // ── loading & empty handling ─────────────────────────────────
  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>;

  if (!position)
    return (
      <EmptyState
        title="Position not found"
        body="Double-check the URL or return to your portfolio."
      />
    );

  // ── main render ───────────────────────────────────────────────
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      {/* ===== MAIN COLUMN ====================================== */}
      <section className="space-y-6 xl:col-span-2">
        {/* header */}
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {position.title}
          </h2>

          <div className="flex flex-wrap items-center gap-4">
            <Stat label="Shares"          value={position.shares} />
            <Stat label="Current Price"   value={`$${position.currentPrice}`} />
            <Stat
              label="Position Value"
              value={`$${(position.shares * position.currentPrice).toLocaleString()}`}
            />

            {/* primary actions */}
            <SellButton onClick={() => setSellOpen(true)} />

            {withdrawable && withdrawable.eth > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWithdrawOpen(true)}
              >
                Withdraw Ξ{withdrawable.eth.toFixed(3)}
              </Button>
            )}
          </div>
        </header>

        {/* price chart */}
        <PositionValueChart data={position.history} />

        {/* modals */}
        <SellModal
          open={sellOpen}
          onOpenChange={setSellOpen}
          assetId={position.id}
        />
        <WithdrawModal
          open={withdrawOpen}
          onOpenChange={setWithdrawOpen}
        />
      </section>

      {/* ===== SIDE COLUMN ====================================== */}
      <aside className="space-y-6">
        <MarketDepthCard assetId={position.id} />
        <OpenOrdersTable assetId={position.id} />
      </aside>
    </div>
  );
}

/* ———————————————————————————————————————————————— */
/* tiny helper for header stats                                */
function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <p className="text-sm text-gray-500 dark:text-gray-400">
      {label}:{" "}
      <span className="font-medium text-gray-900 dark:text-white">{value}</span>
    </p>
  );
}
