import { useState } from "react";
import { useMintNft } from "../../hooks/useMintNft";
import Button from "../ui/button/Button";

export default function MintNftCard() {
  const { mutateAsync, isPending } = useMintNft();
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
          Mint New NFT
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <input
            name="name"
            placeholder="Name"
            required
            className="input"
          />
          <input
            name="description"
            placeholder="Description"
            required
            className="input"
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0])}
            className="file-input col-span-2"
            required
          />
        </div>

        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
          {isPending ? "Minting…" : "Mint NFT"}
        </Button>
      </form>
    </div>
  );
}
