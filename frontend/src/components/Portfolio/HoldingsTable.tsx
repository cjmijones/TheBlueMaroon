import { Link } from "react-router-dom";
import { usePositions } from "../../hooks/usePositions";
import EmptyState from "../ui/empty/EmptyState";

export default function HoldingsTable() {
  const { data = [], isLoading, error } = usePositions();

  if (isLoading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>;
  }

  if (error) {
    return (
      <EmptyState
        title="Holdings unavailable"
        body="The live portfolio endpoint could not be loaded."
      />
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title="No launched creator assets yet"
        body="Finalized fractional vaults will appear here. Purchased share positions need a live position model before they are shown."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left dark:bg-gray-900">
          <tr className="text-gray-500 dark:text-gray-400">
            <th className="px-4 py-3">Asset</th>
            <th className="px-4 py-3">Shares</th>
            <th className="px-4 py-3">Vault</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {data.map((position) => (
            <tr
              key={position.id}
              className="border-t border-gray-100 dark:border-gray-800"
            >
              <td className="px-4 py-3">
                <Link
                  to={`/holding/${position.id}`}
                  className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  {position.title}
                </Link>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  NAV and trading prices unavailable
                </p>
              </td>
              <td className="px-4 py-3">
                {position.shares == null ? "Not recorded" : position.shares.toLocaleString()}
              </td>
              <td className="px-4 py-3 font-mono text-xs">
                {position.vault ? truncateAddress(position.vault) : "Not recorded"}
              </td>
              <td className="px-4 py-3 capitalize">{formatStatus(position.status)}</td>
              <td className="px-4 py-3 text-right">
                <Link
                  to={`/holding/${position.id}`}
                  className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}
