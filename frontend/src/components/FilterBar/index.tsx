// components/FilterBar/index.tsx
import { useDebounce } from "../../hooks/useDebounce";
import { useEffect, useState } from "react";
import { FunnelIcon } from "../../icons";

export type Filters = {
  search: string;
  sort: "newest" | "price-asc" | "price-desc";
  category: "all" | "painting" | "sculpture" | "photography";
};

interface Props {
  value: Filters;
  onChange: (f: Filters) => void;
}

export default function FilterBar({ value, onChange }: Props) {
  const [localSearch, setLocalSearch] = useState(value.search);
  const [debounced] = useDebounce(localSearch, 300);

  // sync search input debounced value → parent
  useEffect(() => {
    if (debounced !== value.search) onChange({ ...value, search: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* search */}
      <input
        type="text"
        placeholder="Search artworks…"
        value={localSearch}
        onChange={(e) => setLocalSearch(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500"
      />

      {/* sort + category */}
      <div className="flex flex-wrap gap-3">
        <select
          value={value.sort}
          onChange={(e) =>
            onChange({ ...value, sort: e.target.value as Filters["sort"] })
          }
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          <option value="newest">Newest</option>
          <option value="price-asc">Price ↑</option>
          <option value="price-desc">Price ↓</option>
        </select>

        <select
          value={value.category}
          onChange={(e) =>
            onChange({ ...value, category: e.target.value as Filters["category"] })
          }
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          <option value="all">All categories</option>
          <option value="painting">Painting</option>
          <option value="sculpture">Sculpture</option>
          <option value="photography">Photography</option>
        </select>

        <button
          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          onClick={() => onChange({ search: "", sort: "newest", category: "all" })}
        >
          <FunnelIcon className="size-4" /> Reset
        </button>
      </div>
    </div>
  );
}