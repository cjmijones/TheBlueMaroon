import axios, {
    AxiosError,
    AxiosInstance,
    AxiosHeaders,
    RawAxiosRequestHeaders,
  } from "axios";
  import { toast } from "sonner";
  import { QueryClient } from "@tanstack/react-query";
  
  /* ------------------------------------------------------------------ */
  /* 1. Build the Axios instance                                         */
  /* ------------------------------------------------------------------ */
  export const api: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_DEV_URL ?? "/api",
    timeout: 10_000,
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
  });
  
  /* ------------------------------------------------------------------ */
  /* 2. Request interceptor – token injector (mutate `.headers`)         */
  /* ------------------------------------------------------------------ */
  export const attachAuthHeader = (
    getToken: () => Promise<string | undefined>,
  ) => {
    api.interceptors.request.use(async (config) => {
      const token = await getToken();
      if (token) {
        /* If Axios has already converted headers to AxiosHeaders… */
        if (
          config.headers &&
          typeof (config.headers as AxiosHeaders).set === "function"
        ) {
          (config.headers as AxiosHeaders).set(
            "Authorization",
            `Bearer ${token}`,
          );
        } else {
          /* …otherwise we’re still on the plain-object branch. */
          config.headers = new AxiosHeaders({
            ...(config.headers as RawAxiosRequestHeaders | undefined),
            Authorization: `Bearer ${token}`,
          });
        }
      }
      return config;
    });
  };
  
  /* ------------------------------------------------------------------ */
  /* 3. Response interceptor – global error handler                      */
  /* ------------------------------------------------------------------ */
  export const wireGlobalErrorHandler = (queryClient: QueryClient) => {
    api.interceptors.response.use(
      (response) => response, // pass-through successes
      async (error: AxiosError) => {
        const status = error.response?.status;
  
        /* Network / CORS error (no status code) */
        if (!status) {
          toast.error("Network error – check your connection");
          return Promise.reject(error);
        }
  
        /* 401 → prompt re-login */
        if (status === 401) {
          toast.error("Session expired – please sign in again");
        }
  
        /* 409 → optimistic-lock helper */
        if (status === 409) {
          queryClient.invalidateQueries();
        }
  
        return Promise.reject(error);
      },
    );
  };
  