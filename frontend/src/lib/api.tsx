// src/lib/api.ts
import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  RawAxiosRequestHeaders,
} from "axios";
import { toast } from "sonner";
import { QueryClient } from "@tanstack/react-query";

const API_PREFIX = "/api";

/**
 * If env var is undefined, use "/api" for the Vite dev proxy or same-origin Docker SPA.
 * If env var is "http://localhost:8000", use "http://localhost:8000/api".
 * If env var already ends in "/api", leave it alone.
 */
function computeBaseURL(raw?: string): string {
  if (!raw || raw.trim() === "") return API_PREFIX;

  const trimmed = raw.replace(/\/+$/, "");
  return trimmed.endsWith(API_PREFIX)
    ? trimmed
    : `${trimmed}${API_PREFIX}`;
}

export const api: AxiosInstance = axios.create({
  baseURL: computeBaseURL(import.meta.env.VITE_API_DEV_URL),
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
});

export const attachAuthHeader = (getToken: () => Promise<string | undefined>) => {
  return api.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) {
      // Axios may already have normalised headers; support both shapes.
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

export const wireGlobalErrorHandler = (queryClient: QueryClient) => {
  return api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const status = error.response?.status;

      if (!status) {
        toast.error("Network error - check your connection");
        return Promise.reject(error);
      }

      if (status === 401) {
        toast.error("Session expired - please sign in again");
      }

      if (status === 409) {
        queryClient.invalidateQueries();
      }

      return Promise.reject(error);
    },
  );
};
