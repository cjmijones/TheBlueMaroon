// components/cards/MintNftCard.tsx
import { useState }   from "react";
import { useMintNft } from "../../hooks/useMintNft";
import Button         from "../ui/button/Button";

export default function MintNftCard() {
  const { mutateAsync, isPending, isReady, errorMsg } = useMintNft();
  const [file, setFile] = useState<File>();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    fd.append("image", file);
    await mutateAsync(fd);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
      <form
        onSubmit={onSubmit}
        className="space-y-6 rounded-2xl bg-white p-6 shadow-default dark:bg-gray-900 sm:p-8"
      >
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Mint&nbsp;New&nbsp;NFT
        </h2>

        {/* inline warning when chain/env not ready */}
        {!isReady && (
          <p className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">
            {errorMsg}
          </p>
        )}

        {/* -------------------- inputs -------------------- */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* name */}
          <input
            name="name"
            placeholder="Name"
            required
            disabled={!isReady || isPending}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm
                       text-gray-700 placeholder-gray-400 shadow-theme-xs
                       focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none
                       disabled:cursor-not-allowed disabled:opacity-50
                       dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500"
          />

          {/* description */}
          <input
            name="description"
            placeholder="Description"
            required
            disabled={!isReady || isPending}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm
                       text-gray-700 placeholder-gray-400 shadow-theme-xs
                       focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none
                       disabled:cursor-not-allowed disabled:opacity-50
                       dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500"
          />

          {/* image file picker (spans both columns) */}
          <input
            type="file"
            accept="image/*"
            required
            onChange={(e) => setFile(e.target.files?.[0])}
            disabled={!isReady || isPending}
            className="col-span-2 w-full cursor-pointer rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm
                       text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-primary-600 file:px-4
                       file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-primary-700
                       focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none
                       disabled:cursor-not-allowed disabled:opacity-50
                       dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          />
        </div>

        {/* submit */}
        <Button
          type="submit"
          disabled={!isReady || isPending}
          className="w-full sm:w-auto"
        >
          {isPending ? "Minting…" : "Mint NFT"}
        </Button>
      </form>
    </div>
  );
}
