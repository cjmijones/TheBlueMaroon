import { usePositions } from "../../hooks/usePositions";

export default function NAVWidget() {
  const { data = [], isLoading } = usePositions();

  if (isLoading) {
    return <Skeleton />;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-sm text-gray-500 dark:text-gray-400">Total NAV</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
        Not available
      </p>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {data.length.toLocaleString()} launched creator round{data.length === 1 ? "" : "s"} tracked.
        A live price source is required before NAV is displayed.
      </p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="h-28 animate-pulse rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800" />
  );
}
