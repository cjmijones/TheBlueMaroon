/* --------------------------------------------------------------
   components/NAVWidget.tsx
-------------------------------------------------------------- */
// src/components/Portfolio/NAVWidget.tsx
import { usePositions } from "../../hooks/usePositions";

export default function NAVWidget() {
  const { data = [], isLoading } = usePositions();
  if (isLoading) return <Skeleton />;

  const nav =
    data.reduce((sum, p) => sum + p.shares * p.currentPrice, 0) || 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-sm text-gray-500 dark:text-gray-400">Total NAV</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
        Ξ{nav.toFixed(3)}
      </p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="h-24 animate-pulse rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800" />
  );
}
