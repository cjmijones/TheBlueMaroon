// src/components/OrderMartket/MarketDepthCard.tsx
import { useOrderBook } from "../../hooks/useOrderBook";
export function MarketDepthCard({ assetId }: { assetId: string }) {
  const { data, isLoading } = useOrderBook(assetId);
  const bids = data?.bids ?? [];
  const asks = data?.asks ?? [];
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white">Depth</h4>
      {isLoading ? <p className="text-xs text-gray-500">Loading…</p> : (
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div>
            {bids.map((b,i)=>(<div key={i} className="flex justify-between"><span>{b.qty}</span><span>{b.price}</span></div>))}
          </div>
          <div className="text-right">
            {asks.map((a,i)=>(<div key={i} className="flex justify-between"><span>{a.price}</span><span>{a.qty}</span></div>))}
          </div>
        </div>) }
    </div>
  );
}