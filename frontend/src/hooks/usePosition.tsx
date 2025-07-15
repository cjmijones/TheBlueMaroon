/* --------------------------------------------------------------
    hooks/usePosition.ts  (single position)
-------------------------------------------------------------- */
import { useQuery } from "@tanstack/react-query";
import { Position } from "./usePositions";

export interface PricePoint {
  date: string;
  value: number;
}

export function usePosition(id: string) {
  return useQuery<Position & { history: PricePoint[] }>({
    queryKey: ["position", id],
    queryFn: () =>
      new Promise((r) =>
        setTimeout(
          () =>
            r({
              id,
              title: id.replace(/-/g, " "),
              shares: 42,
              avgPrice: 130,
              currentPrice: 135,
              history: Array.from({ length: 12 }).map((_, i) => ({
                date: `2025-${String(i + 1).padStart(2, "0")}-01`,
                value: 120 + i * 2,
              })),
            }),
          400,
        ),
      ),
  });
}