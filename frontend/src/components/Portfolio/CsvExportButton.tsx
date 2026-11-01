/* --------------------------------------------------------------
   components/portfolio/CsvExportButton.tsx
-------------------------------------------------------------- */
import { Txn } from "../../hooks/useTransactions";

export default function CsvExportButton({ data }: { data: Txn[] }) {
  function handleExport() {
    const header = "hash,date,method,status,chainId,wallet\n";
    const rows = data.map((t) => `${t.hash},${t.date},${t.method},${t.status},${t.chainId},${t.wallet ?? ""}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "transactions.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <button onClick={handleExport} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.05]">Export CSV</button>
  );
}
