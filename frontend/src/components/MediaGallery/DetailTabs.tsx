// ▒▒▒ components/DetailTabs.tsx ▒▒▒
import { useState } from "react";
import { Asset } from "../../hooks/useAsset";

const TABS = ["Overview", "Documents", "Activity"] as const;

type Tab = (typeof TABS)[number];

export default function DetailTabs({ asset }: { asset: Asset }) {
  const [tab, setTab] = useState<Tab>("Overview");

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-4 flex gap-4 border-b border-gray-200 dark:border-gray-800">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "pb-2 text-sm font-medium " +
              (tab === t
                ? "border-b-2 border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300")
            }
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <p className="text-gray-700 dark:text-gray-300">{asset.description}</p>
      )}

      {tab === "Documents" && (
        <ul className="space-y-2">
          {asset.documents.map((doc) => (
            <li key={doc.url}>
              <a
                href={doc.url}
                className="text-brand-600 underline-offset-4 hover:underline dark:text-brand-400"
                target="_blank"
                rel="noopener noreferrer"
              >
                {doc.name}
              </a>
            </li>
          ))}
        </ul>
      )}

      {tab === "Activity" && (
        <table className="w-full text-sm text-gray-700 dark:text-gray-300">
          <thead>
            <tr className="text-left">
              <th className="py-1">Type</th>
              <th className="py-1">Date</th>
              <th className="py-1 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {asset.recentActivity.map((a, i) => (
              <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                <td className="py-1 capitalize">{a.tx}</td>
                <td className="py-1">{a.date}</td>
                <td className="py-1 text-right">{a.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}