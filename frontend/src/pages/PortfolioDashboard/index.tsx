import NAVWidget from "../../components/Portfolio/NAVWidget";
import HoldingsTable from "../../components/Portfolio/HoldingsTable";

export default function PortfolioDashboard() {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 md:col-span-4"><NAVWidget /></div>
      <div className="col-span-12 md:col-span-8"><HoldingsTable /></div>
    </div>
  );
}