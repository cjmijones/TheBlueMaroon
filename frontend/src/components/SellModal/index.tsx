import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import Button from "../ui/button/Button";
import { useSellQuote } from "../../hooks/useSellQuote";

export function SellModal({
  open,
  onOpenChange,
  assetId,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  assetId: string;
}) {
  const { data } = useSellQuote(assetId, 0);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-900">
          <header className="mb-4 flex items-start justify-between">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
              Sell Shares
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded p-1 hover:bg-gray-100 dark:hover:bg-white/5">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </header>

          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <p>{data?.reason ?? "Sell quotes are not connected yet."}</p>
            <p className="font-mono text-xs text-gray-500 dark:text-gray-500">
              Asset: {assetId}
            </p>
          </div>

          <footer className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="outline">Close</Button>
            </Dialog.Close>
            <Button disabled>Trading unavailable</Button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
