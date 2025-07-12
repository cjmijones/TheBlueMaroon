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
  nextCursor?: string | null;
};

// MOCK dataset (10 items) — replace later
import { addDays, subYears } from "date-fns";
const MOCK: Listing[] = Array.from({ length: 10 }).map((_, i) => ({
  id: `mock-${i}`,
  title: `Mock Artwork #${i + 1}`,
  price_per_share: 50 + i * 5,
  category: i % 2 === 0 ? "painting" : "sculpture",
  created_at: addDays(subYears(new Date(), 1), i * 30).toISOString(),
  image_url: `/images/mock/art-${(i % 5) + 1}.jpg`,
}));

export function useListings(filters: Filters, pageSize = 6) {
  return useInfiniteQuery<ListingsResponse>({
    queryKey: ["listings", filters],
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    queryFn: ({ pageParam }) =>
      new Promise<ListingsResponse>((resolve) => {
        /* simulate filtering + pagination locally */
        let rows = [...MOCK];
        if (filters.category !== "all")
          rows = rows.filter((r) => r.category === filters.category);
        if (filters.search)
          rows = rows.filter((r) =>
            r.title.toLowerCase().includes(filters.search.toLowerCase())
          );
        if (filters.sort === "price-asc") rows.sort((a, b) => a.price_per_share - b.price_per_share);
        if (filters.sort === "price-desc") rows.sort((a, b) => b.price_per_share - a.price_per_share);
        if (filters.sort === "newest") rows.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

        const start = pageParam ? Number(pageParam) : 0;
        const slice = rows.slice(start, start + pageSize);
        const nextCursor = start + pageSize < rows.length ? String(start + pageSize) : null;

        setTimeout(() =>
          resolve({ items: slice, nextCursor }),
          500
        );
      }),
  });
}
