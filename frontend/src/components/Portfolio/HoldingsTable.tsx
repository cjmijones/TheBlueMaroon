/* --------------------------------------------------------------
   components/HoldingsTable/index.tsx + Row
-------------------------------------------------------------- */
import { usePositions } from "../../hooks/usePositions";
import { Link } from "react-router-dom";

export default function HoldingsTable() {
  const { data, isLoading } = usePositions();
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Holdings</h3>
      <div className="max-w-full overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400">
            <tr>
              <th className="py-2 pr-4">Asset</th>
              <th className="py-2 px-4">Shares</th>
              <th className="py-2 px-4">Avg. Price</th>
              <th className="py-2 px-4">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 pr-4">Loading…</td>
                    <td className="py-3 px-4">—</td>
                    <td className="py-3 px-4">—</td>
                    <td className="py-3 px-4">—</td>
                  </tr>
                ))
              : data?.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="py-3 pr-4">
                      <Link to={`/holding/${p.id}`} className="text-brand-600 hover:underline dark:text-brand-400">
                        {p.title}
                      </Link>
                    </td>
                    <td className="py-3 px-4">{p.shares}</td>
                    <td className="py-3 px-4">${p.avgPrice}</td>
                    <td className="py-3 px-4">${(p.shares * p.currentPrice).toLocaleString()}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}