import { PropsWithChildren, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
  api,
  attachAuthHeader,
  wireGlobalErrorHandler,
} from "../lib/api";
import { useSupabaseAuth } from "./SupabaseAuthProvider";

const queryClient = new QueryClient();

/**
 * Bridges React-world hooks (Supabase, React Query) with Axios interceptors.
 * Place inside <SupabaseAuthProvider>, above your app router / UI.
 */
export function ApiProvider({ children }: PropsWithChildren) {
  const { getAccessToken } = useSupabaseAuth();

  useEffect(() => {
    const requestInterceptor = attachAuthHeader(() => getAccessToken().catch(() => undefined));
    const responseInterceptor = wireGlobalErrorHandler(queryClient);

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [getAccessToken]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
