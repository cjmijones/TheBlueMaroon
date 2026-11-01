import { useState } from "react";
import { useAccount, useChainId } from "wagmi";

import { useFractionalize } from "../../hooks/useFractionalize";
import { usePortfolio } from "../../hooks/usePortfolio";
import Button from "../ui/button/Button";
import InputField from "../form/input/InputField";
import {
  describeFractionalizableAsset,
  getFractionalizableAssets,
  type FractionalizableAsset,
} from "./fractionalizeAssetSelection";

export default function FractionalizeCard() {
  const { address } = useAccount();
  const connectedChainId = useChainId();
  const { mutateAsync, isPending, isReady, errorMsg, stageLabel, walletControl } =
    useFractionalize();
  const portfolio = usePortfolio(address, connectedChainId);
  const [price, setPrice] = useState<number>(0);
  const [manualMode, setManualMode] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");

  const eligibleAssets = getFractionalizableAssets(
    portfolio.data?.created_assets ?? [],
    portfolio.data?.wallets ?? [],
  );
  const selectedAsset = eligibleAssets.find((asset) => asset.id === selectedAssetId) ?? eligibleAssets[0];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget as HTMLFormElement);
    const assetInput = manualMode
      ? {
          nft: f.get("nft") as `0x${string}`,
          tokenId: Number(f.get("tokenId")),
        }
      : selectedAssetToInput(selectedAsset);

    if (!assetInput) {
      return;
    }

    await mutateAsync({
      nft: assetInput.nft,
      tokenId: assetInput.tokenId,
      shares: Number(f.get("shares")),
      roundPrice: price,
    });
  };

  const disabled = isPending || !isReady;
  const pendingLabel = stageLabel || "Creating...";
  const hasEligibleAssets = eligibleAssets.length > 0;
  const requiresAssetSelection = !manualMode && !selectedAsset;
  const submitDisabled = disabled || requiresAssetSelection;

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
      <form
        onSubmit={onSubmit}
        className="space-y-6 rounded-2xl bg-white p-6 shadow-default dark:bg-gray-900 sm:p-8"
      >
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Fractionalize NFT
        </h2>

        {!isReady && (
          <p className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">
            {errorMsg ?? walletControl.message}
          </p>
        )}

        {isReady && errorMsg && (
          <p className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">
            {errorMsg}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {manualMode
              ? "Manual contract entry is available for testing and edge cases."
              : "Choose a minted creator NFT from your linked wallets."}
          </p>
          <button
            type="button"
            onClick={() => setManualMode((value) => !value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            disabled={isPending}
          >
            {manualMode ? "Use asset picker" : "Manual entry"}
          </button>
        </div>

        {!manualMode && portfolio.isLoading && (
          <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-white/[0.04] dark:text-gray-300">
            Loading minted assets...
          </p>
        )}

        {!manualMode && !portfolio.isLoading && !hasEligibleAssets && (
          <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-white/[0.04] dark:text-gray-300">
            No eligible minted assets found. Mint an NFT with a linked wallet first, or use manual entry.
          </p>
        )}

        {!manualMode && hasEligibleAssets && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Minted asset
            </label>
            <select
              value={selectedAsset?.id ?? ""}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              disabled={disabled}
              className="w-full rounded-lg border px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              {eligibleAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {describeFractionalizableAsset(asset)} - {asset.nft_contract.slice(0, 6)}...
                  {asset.nft_contract.slice(-4)}
                </option>
              ))}
            </select>
            {selectedAsset && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Contract {selectedAsset.nft_contract.slice(0, 6)}...
                {selectedAsset.nft_contract.slice(-4)} · Token #{selectedAsset.token_id}
              </p>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          {manualMode && (
            <>
              <InputField
                name="nft"
                placeholder="NFT Contract"
                required
                disabled={disabled}
                className="col-span-2 w-full"
              />

              <InputField
                name="tokenId"
                type="number"
                placeholder="ID"
                required
                disabled={disabled}
                className="w-full"
              />
            </>
          )}

          <InputField
            name="shares"
            type="number"
            placeholder="Shares"
            required
            disabled={disabled}
            className="col-span-3 w-full"
          />

          <InputField
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(parseFloat(e.target.value))}
            placeholder="Offering Price (optional)"
            className="col-span-3 w-full"
          />
        </div>

        {isPending && (
          <p className="text-sm text-gray-600 dark:text-gray-300">{pendingLabel}</p>
        )}

        <Button type="submit" disabled={submitDisabled} className="w-full sm:w-auto">
          {isPending ? pendingLabel : "Create Vault"}
        </Button>
      </form>
    </div>
  );
}

function selectedAssetToInput(asset?: FractionalizableAsset | null) {
  if (!asset) return null;
  return {
    nft: asset.nft_contract as `0x${string}`,
    tokenId: Number(asset.token_id),
  };
}
