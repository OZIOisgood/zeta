import { useAuthStore } from "./auth-store";
import { isTokenExpired, tokenStorage } from "./token-storage";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Singleton promise to avoid concurrent refresh races
let refreshPromise: Promise<string> | null = null;

async function getValidAccessToken(): Promise<string | null> {
  const accessToken = await tokenStorage.getAccessToken();

  if (accessToken && !isTokenExpired(accessToken)) {
    return accessToken;
  }

  // Token is missing or expired — try to refresh
  const refreshToken = await tokenStorage.getRefreshToken();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${BASE_URL}/auth/mobile/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        // Refresh failed — clear stored tokens and sign out
        await tokenStorage.clearTokens();
        useAuthStore.getState().signOut();
        throw new ApiError("Session expired", 401, "SESSION_EXPIRED");
      }

      const data = await response.json();
      await tokenStorage.setAccessToken(data.access_token);
      await tokenStorage.setRefreshToken(data.refresh_token);
      return data.access_token as string;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getValidAccessToken();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Timezone": timezone,
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    let code: string | undefined;
    try {
      const body = await response.json();
      message = body.message ?? body.error ?? message;
      code = body.code;
    } catch {
      // ignore parse error
    }
    throw new ApiError(message, response.status, code);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, init?: RequestInit) =>
    request<T>(path, { ...init, method: "GET" }),

  post: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string, init?: RequestInit) =>
    request<T>(path, { ...init, method: "DELETE" }),
};
