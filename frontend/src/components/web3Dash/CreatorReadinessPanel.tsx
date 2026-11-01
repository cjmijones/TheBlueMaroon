import { ShieldCheck } from "lucide-react";

import { useCreatorReadiness } from "../../hooks/useCreatorReadiness";
import { useStartKyc } from "../../hooks/useKyc";
import Badge from "../ui/badge/Badge";
import Button from "../ui/button/Button";

function StatusRow({
  label,
  value,
  ready,
}: {
  label: string;
  value: string;
  ready: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-gray-100 py-3 dark:border-gray-800">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <Badge size="sm" color={ready ? "success" : "warning"}>
        {value}
      </Badge>
    </div>
  );
}

export default function CreatorReadinessPanel() {
  const readiness = useCreatorReadiness();
  const startKyc = useStartKyc();
  const canStartKyc =
    Boolean(readiness.profile) &&
    !readiness.kycIsClear &&
    readiness.kycStatus !== "pending";

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-brand-500" aria-hidden="true" />
            <p className="text-sm font-medium uppercase text-gray-500 dark:text-gray-400">
              Creator readiness
            </p>
          </div>
          <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
            {readiness.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            {readiness.message}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge
            size="sm"
            color={readiness.canUseCreatorActions ? "success" : "warning"}
          >
            {readiness.canUseCreatorActions ? "Ready" : "Blocked"}
          </Badge>
          {canStartKyc && (
            <Button
              size="sm"
              onClick={() => startKyc.mutate()}
              disabled={startKyc.isPending}
            >
              {startKyc.isPending ? "Starting KYC" : "Start KYC"}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4">
        <StatusRow
          label="Wallet"
          value={readiness.walletReady ? "Linked" : "Needs attention"}
          ready={readiness.walletReady}
        />
        <StatusRow
          label="Creator role"
          value={readiness.hasCreatorRole ? "Creator" : "Missing"}
          ready={readiness.hasCreatorRole}
        />
        <StatusRow
          label="KYC"
          value={readiness.kycLabel}
          ready={readiness.kycIsClear}
        />
      </div>

      {startKyc.error && (
        <p className="mt-3 rounded-lg bg-error-50 p-3 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-300">
          KYC could not be started. Check the backend and try again.
        </p>
      )}
    </section>
  );
}

