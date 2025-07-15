/* --------------------------------------------------------------
   components/NAVWidget.tsx
-------------------------------------------------------------- */
import { usePositions } from "../../hooks/usePositions";

export default function NAVWidget() {
  const { data } = usePositions();
  const nav = data?.reduce((sum, p) => sum + p.shares * p.currentPrice, 0) ?? 0;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-sm text-gray-500 dark:text-gray-400">Total Net Asset Value</p>
      <h3 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">${nav.toLocaleString()}</h3>
    </div>
  );
}