/* --------------------------------------------------------------
   components/PositionValueChart.tsx  (uses recharts)
-------------------------------------------------------------- */
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
  } from "recharts";
  import { PricePoint } from "../../hooks/usePosition";
  
export default function PositionValueChart({ data }: { data: PricePoint[] }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Value Over Time</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -10, right: 0, top: 10, bottom: 0 }}>
            <XAxis dataKey="date" hide />
            <YAxis domain={["auto", "auto"]} hide />
            <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
            <Line type="monotone" dataKey="value" stroke="#465FFF" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}