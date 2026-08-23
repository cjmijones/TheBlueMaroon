const configuredBaseUrl = import.meta.env.VITE_API_DEV_URL;

export const apiBaseUrl = configuredBaseUrl
  ? configuredBaseUrl.replace(/\/$/, "")
  : "";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiGet<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    let message = response.statusText || "Request failed";
    try {
      const body = (await response.json()) as { detail?: string };
      message = body.detail ?? message;
    } catch {
      // Non-JSON errors still carry the HTTP status below.
    }
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as T;
}
