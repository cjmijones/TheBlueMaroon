/* --------------------------------------------------------------
   pages/HoldingDetail/index.tsx
-------------------------------------------------------------- */
import { useParams } from "react-router-dom";
import { usePosition } from "../../hooks/usePosition";
import PositionValueChart from "../../components/Portfolio/PositionValueChart";
import Button from "../../components/ui/button/Button";
import { useState } from "react";
import CheckoutModal from "../../components/CheckoutModal";

export default function HoldingDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { data, isLoading } = usePosition(id);
  const [open, setOpen] = useState(false);

  if (isLoading || !data) return <p>Loading…</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{data.title}</h2>
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Shares: <span className="font-medium text-gray-900 dark:text-white">{data.shares}</span>
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Current Price: <span className="font-medium text-gray-900 dark:text-white">${data.currentPrice}</span>
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Position Value: <span className="font-medium text-gray-900 dark:text-white">${(data.shares * data.currentPrice).toLocaleString()}</span>
        </p>
        <Button onClick={() => setOpen(true)}>Buy / Sell</Button>
      </div>
      <PositionValueChart data={data.history} />
      <CheckoutModal open={open} onOpenChange={setOpen} assetTitle={data.title} />
    </div>
  );
}