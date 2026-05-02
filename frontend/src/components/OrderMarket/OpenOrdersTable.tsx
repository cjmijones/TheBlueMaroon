// src/components/OrderMarket/OpenOrdersTable.tsx
import { useOpenOrders } from "../../hooks/useOpenOrders";
import Button from "../ui/button/Button";
export function OpenOrdersTable({ assetId }: { assetId: string }) {
  const { data } = useOpenOrders(assetId);
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white">Open Orders</h4>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400">
            <th>Qty</th><th>Price</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          {data?.map(o => (
            <tr key={o.id} className="border-t border-gray-100 dark:border-gray-800">
              <td>{o.qty}</td>
              <td>{o.price}</td>
              <td>{o.status}</td>
              <td className="text-right">
                <Button size="sm" variant="outline" disabled>
                  Cancel
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}