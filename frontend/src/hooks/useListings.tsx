import { useInfiniteQuery } from "@tanstack/react-query";
import type { Filters } from "../components/FilterBar";

export interface Listing {
  id: string;
  title: string;
  price_per_share: number;
  image_url?: string;
  category: Filters["category"];
  created_at: string;
}

type ListingsResponse = {
  items: Listing[];
  nextCursor: null;
  unavailableReason: string;
};

export function useListings(filters: Filters) {
  return useInfiniteQuery<ListingsResponse>({
    queryKey: ["listings", filters, "unavailable"],
    initialPageParam: null,
    getNextPageParam: () => undefined,
    queryFn: async () => ({
      items: [],
      nextCursor: null,
      unavailableReason:
        "Marketplace listings are hidden until live listing routes and pricing data are implemented.",
    }),
    staleTime: Infinity,
  });
}
