// components/cards/MintNftCard.tsx
import { useState }   from "react";
import { useMintNft } from "../../hooks/useMintNft";
import Button         from "../ui/button/Button";
import InputField from "../form/input/InputField";
import FileInput from "../form/input/FileInput";

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
          <InputField
            name="name"
            placeholder="Name"
            required
            disabled={!isReady || isPending}
            className="w-full"
          />

          {/* description */}
          <InputField
            name="description"
            placeholder="Description"
            required
            disabled={!isReady || isPending}
            className="w-full"
          />

          {/* image file picker (spans both columns) */}
          <FileInput
            name="image"
            accept="image/*"
            required
            onChange={(e) => setFile(e.target.files?.[0])}
            disabled={!isReady || isPending}
            className="col-span-2 w-full"
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
