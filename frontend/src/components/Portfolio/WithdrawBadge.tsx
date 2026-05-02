// src/components/WithdrawBadge.tsx
export function WithdrawBadge({ amount }: { amount: number }) {
    return (
      <span className="rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-400">
        Withdrawable • Ξ{amount.toFixed(2)}
      </span>
    );
  }