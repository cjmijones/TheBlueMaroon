import { useState } from "react";
import Button from "../ui/button/Button";
import CheckoutModal from "../CheckoutModal";

export default function BuySellButtons({ assetId }: { assetId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex gap-3">
        <Button size="md" className="w-full" onClick={() => setOpen(true)}>
          Purchase unavailable
        </Button>
        <Button
          variant="outline"
          size="md"
          className="w-full"
          disabled
          aria-label="Selling requires live marketplace order routes"
        >
          Sell unavailable
        </Button>
      </div>

      {open && (
        <CheckoutModal
          open={open}
          onOpenChange={setOpen}
          assetTitle={`Asset ${assetId}`}
        />
      )}
    </>
  );
}
