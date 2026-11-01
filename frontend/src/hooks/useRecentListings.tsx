import { useQuery } from "@tanstack/react-query";

export interface Listing {
  id: string;
  title: string;
  price_per_share: number;
  image_url?: string;
}

export function useRecentListings(limit = 3) {
  return useQuery<Listing[]>({
    queryKey: ["recentListings", limit, "unavailable"],
    queryFn: async () => [],
    staleTime: Infinity,
  });
}
