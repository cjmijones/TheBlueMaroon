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
    <Modal isOpen={open} onClose={() => onOpenChange(false)} className="m-4 max-w-md">
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

        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>
            Checkout is not connected to live marketplace settlement yet.
          </p>
          <p>
            Purchases need database-backed listings, share balances, price handling,
            and transaction bookkeeping before this action can be enabled.
          </p>
        </div>

        <footer className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button disabled>Checkout unavailable</Button>
        </footer>
      </div>
    </Modal>
  );
}
