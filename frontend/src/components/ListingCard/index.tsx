// components/ListingCard/index.tsx
import type { Listing } from "../../hooks/useListings";
import { Link } from "react-router-dom";

export default function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link
      to={`/asset/${listing.id}`}
      className="group block rounded-2xl border border-gray-200 bg-white shadow-sm transition-transform hover:-translate-y-px hover:shadow-md dark:border-gray-800 dark:bg-white/[0.03]"
    >
      <div className="aspect-[4/3] overflow-hidden rounded-t-2xl">
        <img
          src={listing.image_url ?? "/images/mock/placeholder.jpg"}
          alt={listing.title}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      </div>

      <div className="p-4 space-y-1">
        <h3 className="truncate font-medium text-gray-900 dark:text-white">
          {listing.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          ${listing.price_per_share.toLocaleString()} / share
        </p>
      </div>
    </Link>
  );
}