export default function ListingCardSkeleton() {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="aspect-[4/3] w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
  
        <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="mt-2 h-3 w-1/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }
  