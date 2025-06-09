import { useWalletBalances } from "../../hooks/useWalletBalances";
import { formatEther, formatUnits } from "viem";
import Button from "../ui/button/Button";
import { DollarLineIcon } from "../../icons";

export default function WalletBalanceCard() {
  const { nativeWei, usdc, loading, refresh } = useWalletBalances();

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
      {/* inner “surface” */}
      <div className="space-y-6 rounded-2xl bg-white p-6 shadow-default dark:bg-gray-900 sm:p-8">
        {/* ── header ─────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            <DollarLineIcon className="size-5 text-gray-600 dark:text-gray-400" />
            Balances
          </h2>

          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
            {loading ? "Loading" : "Refresh"}
          </Button>
        </header>

        {/* ── balances grid ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-6 text-center">
          {/* native ETH */}
          <div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">
              {formatEther(nativeWei)}{" "}
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                ETH
              </span>
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Ethereum
            </p>
          </div>

          {/* USDC */}
          <div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">
              {Number(formatUnits(BigInt(usdc), 6)).toLocaleString()}{" "}
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                USDC
              </span>
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              ERC-20
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
