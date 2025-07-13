// src/components/CheckoutModal/index.tsx
import { Modal } from "../ui/modal";
import { CloseIcon } from "../../icons";
import Button from "../ui/button/Button";

export interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetTitle?: string;
}

export default function CheckoutModal({
  open,
  onOpenChange,
  assetTitle = "Untitled Asset",
}: CheckoutModalProps) {
  return (
    <Modal isOpen={open} onClose={() => onOpenChange(false)} className="max-w-md m-4">
      <div className="relative w-full p-6">
        <header className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Buy shares in <span className="whitespace-nowrap">{assetTitle}</span>
          </h2>
          <button 
            onClick={() => onOpenChange(false)}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <CloseIcon className="size-4" />
          </button>
        </header>

        {/* ——————————————————— */}
        {/*  Placeholder content  */}
        {/* ——————————————————— */}
        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
          <p>This is a placeholder for the checkout flow.</p>
          <p>
            Later we'll add amount selection, wallet connect, gas estimate,
            and transaction status handling here.
          </p>
        </div>

        <footer className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled>Confirm (Soon)</Button>
        </footer>
      </div>
    </Modal>
  );
}
