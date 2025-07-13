// ▒▒▒ pages/AssetDetail/index.tsx ▒▒▒
import { useParams, Link } from "react-router-dom";
import { useAsset } from "../../hooks/useAsset";
import MediaGallery from "../../components/MediaGallery/MediaGallery";
import KeyMetrics from "../../components/MediaGallery/KeyMetrics";
import DetailTabs from "../../components/MediaGallery/DetailTabs";
import BuySellButtons from "../../components/MediaGallery/BuySellButtons";
import { ChevronLeftIcon } from "../../icons";

export default function AssetDetail() {
  const { id } = useParams();
  const { data, isLoading } = useAsset(id as string);

  if (!id) return <div className="p-6">Invalid asset id</div>;

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <Link
        to="/explore"
        className="inline-flex items-center gap-1 text-brand-600 underline-offset-4 hover:underline dark:text-brand-400"
      >
        <ChevronLeftIcon className="size-4" /> Back to Explore
      </Link>

      {/* graceful loader */}
      {isLoading ? (
        <div className="grid animate-pulse gap-6 lg:grid-cols-2">
          <div className="aspect-square rounded-2xl bg-gray-100 dark:bg-gray-800" />
          <div className="space-y-4">
            <div className="h-8 w-2/3 rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-4 w-1/2 rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-4 w-1/3 rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
      ) : (
        data && (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              <MediaGallery images={data.images} />
              <div className="space-y-6">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {data.title}
                </h1>

                <KeyMetrics asset={data} />

                <BuySellButtons assetId={data.id} />
              </div>
            </div>

            <DetailTabs asset={data} />
          </>
        )
      )}
    </div>
  );
}