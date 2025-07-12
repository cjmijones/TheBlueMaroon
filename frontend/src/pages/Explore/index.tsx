/* ===============================================================
 * 1. Explore page                              src/pages/Explore
 * =============================================================== */

// pages/Explore/index.tsx
import { useState, useRef, useCallback, useEffect } from "react";
import FilterBar, { Filters } from "../../components/FilterBar";
import ListingCard from "../../components/ListingCard";
import ListingCardSkeleton from "../../components/ListingCard/ListingCardSkeleton";
import { useListings } from "../../hooks/useListings";

export default function ExplorePage() {
  /* ------------------------ filter state ----------------------- */
  const [filters, setFilters] = useState<Filters>({
    search: "",
    sort: "newest",
    category: "all",
  });

  /* ---------------------- listings query ---------------------- */
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useListings(filters);

  /* -------------------- infinite scroll hook ------------------- */
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const intersectionCb = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  // Attach observer
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(intersectionCb, {
      root: null,
      rootMargin: "0px",
      threshold: 1.0,
    });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [intersectionCb]);

  /* ---------------------------- ui ----------------------------- */
  return (
    <div className="space-y-10">
      <FilterBar value={filters} onChange={setFilters} />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => (
            <ListingCardSkeleton key={`sk-${i}`} />
          ))}

        {data?.pages.flatMap((page) => page.items).map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>

      {/* sentinel for infinite scroll */}
      <div ref={sentinelRef} />

      {isFetchingNextPage && (
        <p className="mt-4 text-center text-gray-500 dark:text-gray-400">
          Loading more…
        </p>
      )}
    </div>
  );
}