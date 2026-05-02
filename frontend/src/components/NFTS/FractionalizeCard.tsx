import { useState }         from "react";
import { useFractionalize } from "../../hooks/useFractionalize";
import Button               from "../ui/button/Button";
import InputField from "../form/input/InputField";

export default function FractionalizeCard() {
  const { mutateAsync, isPending, error } = useFractionalize();
  const [price, setPrice] = useState<number>(0);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget as HTMLFormElement);
    await mutateAsync({
      nft:   f.get("nft") as `0x${string}`,
      tokenId:    Number(f.get("tokenId")),
      shares:Number(f.get("shares")),
      roundPrice: price,
    });
  };

  const disabled = isPending;

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
      <form
        onSubmit={onSubmit}
        className="space-y-6 rounded-2xl bg-white p-6 shadow-default dark:bg-gray-900 sm:p-8"
      >
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Fractionalize NFT
        </h2>

        {error && (
          <p className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">
            {error.message}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          {/* NFT contract */}
          <InputField name="nft" placeholder="NFT Contract" required disabled={disabled} className="col-span-2 w-full" />

          {/* tokenId */}
          <InputField name="tokenId" type="number" placeholder="ID" required disabled={disabled} className="w-full" />

          {/* shares */}
          <InputField name="shares" type="number" placeholder="Shares" required disabled={disabled} className="col-span-3 w-full" />

          {/* fixed-price round */}
          <InputField type="number" step="0.01" min="0" value={price} onChange={e => setPrice(parseFloat(e.target.value))} placeholder="Offering Price (optional)" className="col-span-3 w-full" />
        </div>

        <Button type="submit" disabled={disabled} className="w-full sm:w-auto">
          {isPending ? "Creating…" : "Create Vault"}
        </Button>
      </form>
    </div>
  );
}
