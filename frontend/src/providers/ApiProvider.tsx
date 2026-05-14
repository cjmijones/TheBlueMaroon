import { PropsWithChildren, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
//   api,                       // exported in case you need direct access
  attachAuthHeader,
  wireGlobalErrorHandler,
} from "../lib/api";
import { useSupabaseAuth } from "./SupabaseAuthProvider";

const queryClient = new QueryClient();

/**
 * Bridges React-world hooks (Supabase, React-Query) with Axios interceptors.
 * Place inside <SupabaseAuthProvider>, above your app router / UI.
 */
export function ApiProvider({ children }: PropsWithChildren) {
  const { getAccessToken } = useSupabaseAuth();

  useEffect(() => {
    /* Attach interceptors exactly once (they are idempotent) */
    attachAuthHeader(() => getAccessToken().catch(() => undefined));
    wireGlobalErrorHandler(queryClient);
  }, [getAccessToken]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
