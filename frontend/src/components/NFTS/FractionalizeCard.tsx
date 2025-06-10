// components/cards/FractionalizeCard.tsx
import { useFractionalize } from "../../hooks/useFractionalize";
import Button from "../ui/button/Button";

export default function FractionalizeCard() {
  const { mutateAsync, isPending } = useFractionalize();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget as HTMLFormElement);
    await mutateAsync({
      nft:     f.get("nft") as `0x${string}`,
      id:      Number(f.get("tokenId")),
      shares:  Number(f.get("shares")),
    });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
      <form
        onSubmit={onSubmit}
        className="space-y-6 rounded-2xl bg-white p-6 shadow-default dark:bg-gray-900 sm:p-8"
      >
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Fractionalize&nbsp;NFT
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <input
            name="nft"
            placeholder="NFT Contract"
            required
            className="col-span-2 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm
                       text-gray-700 placeholder-gray-400 shadow-theme-xs
                       focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none
                       dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500"
          />

          <input
            name="tokenId"
            placeholder="ID"
            type="number"
            required
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm
                       text-gray-700 placeholder-gray-400 shadow-theme-xs
                       focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none
                       dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500"
          />

          <input
            name="shares"
            placeholder="Shares"
            type="number"
            required
            className="col-span-3 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm
                       text-gray-700 placeholder-gray-400 shadow-theme-xs
                       focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none
                       dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500"
          />
        </div>

        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
          {isPending ? "Creating…" : "Create Vault"}
        </Button>
      </form>
    </div>
  );
}
