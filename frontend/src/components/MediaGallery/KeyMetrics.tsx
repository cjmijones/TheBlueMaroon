// ▒▒▒ components/KeyMetrics.tsx ▒▒▒
import { Asset } from "../../hooks/useAsset";

export default function KeyMetrics({ asset }: { asset: Asset }) {
  const pctSold = (asset.shares_sold / asset.total_shares) * 100;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Price / share</p>
          <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
            ${asset.price_per_share}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total raised</p>
          <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
            {asset.shares_sold * asset.price_per_share}$
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
          <div 
            className="h-2 rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${pctSold}%` }}
          />
        </div>
      </div>
      <p className="mt-2 text-right text-xs text-gray-500 dark:text-gray-400">
        {pctSold.toFixed(0)}% sold
      </p>
    </div>
  );
}