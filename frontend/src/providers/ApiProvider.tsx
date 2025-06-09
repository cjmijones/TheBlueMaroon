import { PropsWithChildren, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth0 } from "@auth0/auth0-react";

import {
//   api,                       // exported in case you need direct access
  attachAuthHeader,
  wireGlobalErrorHandler,
} from "../lib/api";

const queryClient = new QueryClient();

/**
 * Bridges React-world hooks (Auth0, React-Query) with Axios interceptors.
 * Place **inside** <Auth0Provider>, **above** your app’s router / UI.
 */
export function ApiProvider({ children }: PropsWithChildren) {
  const { getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    /* Attach interceptors exactly once (they are idempotent) */
    attachAuthHeader(() =>
      getAccessTokenSilently().catch(() => undefined),
    );
    wireGlobalErrorHandler(queryClient);
  }, [getAccessTokenSilently]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
