// components/FilterBar/index.tsx
import { useDebounce } from "../../hooks/useDebounce";
import { useEffect, useState } from "react";
import { FunnelIcon } from "../../icons";
import InputField from "../form/input/InputField";
import Select from "../form/Select";

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
      <InputField
        type="text"
        placeholder="Search artworks…"
        value={localSearch}
        onChange={(e) => setLocalSearch(e.target.value)}
        className="w-full"
      />

      {/* sort + category */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={value.sort}
          onChange={(e) =>
            onChange({ ...value, sort: e.target.value as Filters["sort"] })
          }
          className="rounded-lg"
        >
          <option value="newest">Newest</option>
          <option value="price-asc">Price ↑</option>
          <option value="price-desc">Price ↓</option>
        </Select>

        <Select
          value={value.category}
          onChange={(e) =>
            onChange({ ...value, category: e.target.value as Filters["category"] })
          }
          className="rounded-lg"
        >
          <option value="all">All categories</option>
          <option value="painting">Painting</option>
          <option value="sculpture">Sculpture</option>
          <option value="photography">Photography</option>
        </Select>

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