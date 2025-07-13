// ▒▒▒ components/MediaGallery.tsx ▒▒▒
interface MediaProps {
    images: string[];
  }
  
  export default function MediaGallery({ images }: MediaProps) {
    return (
      <div className="aspect-square overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <img
          src={images[0]}
          alt="Artwork"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }