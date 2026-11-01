import { Link, useParams } from "react-router-dom";
import { ChevronLeftIcon } from "../../icons";
import EmptyState from "../../components/ui/empty/EmptyState";
import { useAsset } from "../../hooks/useAsset";

export default function AssetDetail() {
  const { id } = useParams();
  const { data, isLoading } = useAsset(id ?? "");

  if (!id) {
    return <EmptyState title="Invalid asset id" body="Return to Explore and choose an asset." />;
  }

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <Link
        to="/explore"
        className="inline-flex items-center gap-1 text-brand-600 underline-offset-4 hover:underline dark:text-brand-400"
      >
        <ChevronLeftIcon className="size-4" /> Back to Explore
      </Link>

      {isLoading ? (
        <div className="h-72 animate-pulse rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800" />
      ) : (
        <EmptyState
          title="Marketplace asset unavailable"
          body={
            data?.reason ??
            "Live asset details will appear after listing routes are connected."
          }
        />
      )}
    </div>
  );
}
