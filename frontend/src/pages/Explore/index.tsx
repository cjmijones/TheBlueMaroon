import { useState, useRef, useCallback, useEffect } from "react";
import FilterBar, { Filters } from "../../components/FilterBar";
import ListingCard from "../../components/ListingCard";
import ListingCardSkeleton from "../../components/ListingCard/ListingCardSkeleton";
import EmptyState from "../../components/ui/empty/EmptyState";
import { useListings } from "../../hooks/useListings";

export default function ExplorePage() {
  const [filters, setFilters] = useState<Filters>({
    search: "",
    sort: "newest",
    category: "all",
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useListings(filters);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const intersectionCb = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

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

  const listings = data?.pages.flatMap((page) => page.items) ?? [];
  const unavailableReason = data?.pages.find((page) => page.unavailableReason)
    ?.unavailableReason;

  return (
    <div className="space-y-10">
      <FilterBar value={filters} onChange={setFilters} />

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ListingCardSkeleton key={`sk-${i}`} />
          ))}
        </div>
      ) : listings.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Marketplace listings unavailable"
          body={
            unavailableReason ??
            "Live listings will appear after the marketplace API is connected."
          }
        />
      )}

      <div ref={sentinelRef} />

      {isFetchingNextPage && (
        <p className="mt-4 text-center text-gray-500 dark:text-gray-400">
          Loading more...
        </p>
      )}
    </div>
  );
}
