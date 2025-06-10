// src/lib/api.ts
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosHeaders,
  RawAxiosRequestHeaders,
} from "axios";
import { toast } from "sonner";
import { QueryClient } from "@tanstack/react-query";

/* ──────────────────────────────────────────────────────────────────────────
   1. Compute a baseURL that ALWAYS ends with /api
   ──────────────────────────────────────────────────────────────────────── */
const API_PREFIX = "/api";

/**
 * If env var is undefined       →  "/api"            (dev-server proxy)
 * If env var = "http://localhost:8000"
 *                               →  "http://localhost:8000/api"
 * If env var = "https://foo.com/api"
 *                               →  "https://foo.com/api"   (unchanged)
 */
function computeBaseURL(raw?: string): string {
  if (!raw || raw.trim() === "") return API_PREFIX;

  const trimmed = raw.replace(/\/+$/, "");          // remove trailing slashes
  return trimmed.endsWith(API_PREFIX)
    ? trimmed
    : `${trimmed}${API_PREFIX}`;
}

export const api: AxiosInstance = axios.create({
  baseURL : computeBaseURL(import.meta.env.VITE_API_DEV_URL),
  timeout : 10_000,
  withCredentials: true,                            // keep if you really need cookies
  headers : { "Content-Type": "application/json" },
});

/* ──────────────────────────────────────────────────────────────────────────
   2. Request interceptor – inject Bearer token
   ──────────────────────────────────────────────────────────────────────── */
export const attachAuthHeader = (getToken: () => Promise<string | undefined>) => {
  api.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) {
      // Axios may already have normalised headers – support both shapes
      if (config.headers && typeof (config.headers as AxiosHeaders).set === "function") {
        (config.headers as AxiosHeaders).set("Authorization", `Bearer ${token}`);
      } else {
        config.headers = new AxiosHeaders({
          ...(config.headers as RawAxiosRequestHeaders | undefined),
          Authorization: `Bearer ${token}`,
        });
      }
    }
    return config;
  });
};

/* ──────────────────────────────────────────────────────────────────────────
   3. Response interceptor – global error handler
   ──────────────────────────────────────────────────────────────────────── */
export const wireGlobalErrorHandler = (queryClient: QueryClient) => {
  api.interceptors.response.use(
    (response) => response,
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

      /* 409 → invalidate stale queries (optimistic-locking helper) */
      if (status === 409) {
        queryClient.invalidateQueries();
      }

      return Promise.reject(error);
    },
  );
};
