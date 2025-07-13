// ▒▒▒ components/BuySellButtons.tsx ▒▒▒
import { useState } from "react";
import Button from "../ui/button/Button";
import CheckoutModal from "../CheckoutModal"; // to be implemented later

export default function BuySellButtons({ assetId }: { assetId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="flex gap-3">
        <Button size="md" className="w-full" onClick={() => setOpen(true)}>
          Buy Shares
        </Button>
        <Button
          variant="outline"
          size="md"
          className="w-full"
          disabled
          aria-label="Secondary market coming soon"
        >
          Sell
        </Button>
      </div>

      {open && <CheckoutModal open={open} onOpenChange={setOpen} assetTitle={`Asset ${assetId}`} />}
    </>
  );
}