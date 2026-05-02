/* --------------------------------------------------------------
   components/HoldingsTable/index.tsx + Row
-------------------------------------------------------------- */
// src/components/Portfolio/HoldingsTable.tsx
import { Link } from "react-router-dom";
import { useState } from "react";
import { usePositions } from "../../hooks/usePositions";
import { SellButton } from "./SellButton";
import { WithdrawBadge } from "./WithdrawBadge";
import { SellModal } from "../SellModal";
import EmptyState from "../ui/empty/EmptyState";

export default function HoldingsTable() {
  const { data = [], isLoading } = usePositions();
  const [sellId, setSellId] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (data.length === 0)
    return (
      <EmptyState
        title="No holdings yet"
        body="Buy your first shares from the Explore page."
      />
    );

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left dark:bg-gray-900">
            <tr className="text-gray-500 dark:text-gray-400">
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3">Shares</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr
                key={p.id}
                className="border-t border-gray-100 dark:border-gray-800"
              >
                <td className="px-4 py-3">
                  <Link
                    to={`/holding/${p.id}`}
                    className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                  >
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3">{p.shares}</td>
                <td className="px-4 py-3">Ξ{p.currentPrice}</td>
                <td className="px-4 py-3">
                  Ξ{(p.shares * p.currentPrice).toFixed(3)}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <SellButton onClick={() => setSellId(p.id)} />
                  {typeof p.withdrawable === "number" && p.withdrawable > 0 && (
                    <WithdrawBadge amount={p.withdrawable} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sellId && (
        <SellModal
          open={!!sellId}
          onOpenChange={() => setSellId(null)}
          assetId={sellId}
        />
      )}
    </>
  );
}
