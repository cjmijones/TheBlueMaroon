import { useOpenOrders } from "../../hooks/useOpenOrders";

export function OpenOrdersTable({ assetId }: { assetId: string }) {
  const { data, isLoading } = useOpenOrders(assetId);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Open Orders</h4>
      {isLoading ? (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Loading...</p>
      ) : (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {data?.reason ?? "Open orders are not connected yet."}
        </p>
      )}
    </div>
  );
}
