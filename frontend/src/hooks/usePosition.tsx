import { mapCreatedAssetToPosition, Position } from "./usePositions";
import { usePortfolio } from "./usePortfolio";

export interface PricePoint {
  date: string;
  value: number;
}

export type PositionDetail = Position & {
  history: PricePoint[];
};

export function usePosition(id: string) {
  const query = usePortfolio();
  const asset = query.data?.created_assets.find(
    (item) => item.id === id && item.lifecycle === "fractionalized_asset",
  );
  const position = asset
    ? {
        ...mapCreatedAssetToPosition(asset),
        history: [],
      }
    : null;

  return {
    ...query,
    data: position satisfies PositionDetail | null,
  };
}
