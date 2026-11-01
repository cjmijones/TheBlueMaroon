import { useOrderBook } from "../../hooks/useOrderBook";

export function MarketDepthCard({ assetId }: { assetId: string }) {
  const { data, isLoading } = useOrderBook(assetId);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Market Depth</h4>
      {isLoading ? (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Loading...</p>
      ) : (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {data?.reason ?? "Market depth is not connected yet."}
        </p>
      )}
    </div>
  );
}
