import { useEffect, useState } from "react";

/**
 * Delay-updates a value until the user has stopped
 * typing / changing it for `delay` milliseconds.
 *
 * @param value  Any serialisable value (string, number, object ref, …)
 * @param delay  Debounce interval in ms (default 300 ms)
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id); // cancel on unmount or value change
  }, [value, delay]);

  return debounced;
}
