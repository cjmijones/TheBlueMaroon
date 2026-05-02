// src/components/SellModal/index.tsx
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import Button from "../ui/button/Button";
import { useState } from "react";
import { useSellQuote } from "../../hooks/useSellQuote";
import InputField from "../form/input/InputField";

export function SellModal({ open, onOpenChange, assetId }: { open: boolean; onOpenChange: (v: boolean) => void; assetId: string; }) {
  const [qty, setQty] = useState("1");
  const { data: quote, isLoading } = useSellQuote(assetId, Number(qty));
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-white/[0.03]">
          <header className="mb-4 flex items-start justify-between">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">Sell Shares</Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded p-1 hover:bg-gray-100 dark:hover:bg-white/5"><X className="size-4"/></button>
            </Dialog.Close>
          </header>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount to sell</label>
            <InputField type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)} className="w-full" />

            {isLoading ? <p className="text-sm text-gray-500">Fetching quote…</p> : (
              <p className="text-sm text-gray-700 dark:text-gray-300">Estimated proceeds: Ξ{quote?.eth?.toFixed(4)} (~${quote?.usd.toFixed(2)})</p>
            )}
          </div>

          <footer className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild><Button>Cancel</Button></Dialog.Close>
            <Button disabled>Confirm (stub)</Button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}