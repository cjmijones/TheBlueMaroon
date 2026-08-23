import { useRecentListings } from "../../hooks/useRecentListings";
import ListingCardSkeleton from "../../components/ListingCard/ListingCardSkeleton";
import EmptyState from "../../components/ui/empty/EmptyState";

export default function RecentListingsCarousel() {
  const { data = [], isLoading } = useRecentListings(3);

  return (
    <section className="mx-auto max-w-6xl px-6">
      <header className="mb-6 flex items-end justify-between">
        <h2 className="text-2xl font-semibold sm:text-3xl">
          Featured Listings
        </h2>
        <a
          href="/explore"
          className="text-brand-600 underline-offset-4 hover:underline"
        >
          View all
        </a>
      </header>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : data.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((item) => (
            <div key={item.id} className="animate-fade-in">
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="aspect-[4/3] overflow-hidden rounded-lg bg-gray-100" />
                <h3 className="mt-4 truncate font-medium">{item.title}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  ${item.price_per_share} / share
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No live featured listings"
          body="Featured marketplace inventory is hidden until listings are backed by live data."
        />
      )}
    </section>
  );
}
