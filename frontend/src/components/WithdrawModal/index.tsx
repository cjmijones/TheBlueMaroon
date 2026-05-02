// src/components/WithdrawModal/index.tsx
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import Button from "../ui/button/Button";
import { useWithdrawable } from "../../hooks/useWithdrawable";

export function WithdrawModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean)=>void; }) {
  const { data } = useWithdrawable();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-white/[0.03]">
          <header className="mb-4 flex items-start justify-between">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">Withdraw Funds</Dialog.Title>
            <Dialog.Close asChild><button className="rounded p-1 hover:bg-gray-100 dark:hover:bg-white/5"><X className="size-4"/></button></Dialog.Close>
          </header>

          <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">
            {data
              ? <>You have Ξ{data.eth.toFixed(4)} (~${data.usd.toFixed(2)}) available to withdraw.</>
              : "Loading available funds…"}
          </p>
          <Button className="w-full" disabled>Withdraw (stub)</Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}