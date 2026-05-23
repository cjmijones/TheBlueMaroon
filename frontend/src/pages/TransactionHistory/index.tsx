/* --------------------------------------------------------------
   pages/TransactionHistory/index.tsx
-------------------------------------------------------------- */
import { useTransactions } from "../../hooks/useTransactions";
import CsvExportButton from "../../components/Portfolio/CsvExportButton";

export default function TransactionHistory() {
  const { data, isLoading } = useTransactions();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Transaction History</h2>
        {data && <CsvExportButton data={data} />}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 px-4">Method</th>
                <th className="py-2 px-4">Status</th>
                <th className="py-2 px-4">Chain</th>
                <th className="py-2 px-4">Tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-3 pr-4" colSpan={5}>Loading…</td>
                    </tr>
                  ))
                : data?.map((t) => (
                    <tr key={t.hash}>
                      <td className="py-3 pr-4">
                        {t.date ? new Date(t.date).toLocaleString() : ""}
                      </td>
                      <td className="py-3 px-4">{t.method}</td>
                      <td className="py-3 px-4">{t.status}</td>
                      <td className="py-3 px-4">{t.chainId}</td>
                      <td className="py-3 px-4 font-mono">
                        {t.hash.slice(0, 10)}...{t.hash.slice(-6)}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
