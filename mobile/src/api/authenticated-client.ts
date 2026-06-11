import createClient from 'openapi-fetch';
import type { paths } from './schema';
import { clearTokens, getTokens, setTokens } from '../auth/token-store';

const DEFAULT_BASE_URL = 'http://localhost:8080';

type Options = {
  baseUrl?: string;
  fetch?: typeof fetch;
  /** Called when a 401 cannot be recovered by refreshing — the session is gone. */
  onSignOut: () => void;
};

/**
 * Typed client with credential handling: injects the stored access token as
 * a Bearer header and, on 401, performs a single-flight refresh and retries
 * the original request once. The /auth/token* endpoints themselves are never
 * intercepted (they are the credential plumbing).
 *
 * Retry limitation: only the retried request's headers are rebuilt; requests
 * with consumed body streams (POST/PUT) may not be retryable — acceptable for
 * now, the app's reads dominate and writes surface the error to the caller.
 */
export function createAuthenticatedClient(options: Options) {
  const baseUrl = options.baseUrl ?? process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE_URL;
  const fetchImpl = options.fetch ?? fetch;
  const client = createClient<paths>({ baseUrl, fetch: fetchImpl });

  let refreshInFlight: Promise<boolean> | null = null;

  async function refreshTokens(): Promise<boolean> {
    const current = await getTokens();
    if (!current) return false;
    const response = await fetchImpl(
      new Request(`${baseUrl}/auth/token/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: current.refreshToken }),
      }),
    );
    if (!response.ok) return false;
    const pair = (await response.json()) as { access_token: string; refresh_token: string };
    await setTokens({ accessToken: pair.access_token, refreshToken: pair.refresh_token });
    return true;
  }

  function isAuthPlumbing(url: string): boolean {
    const pathname = new URL(url).pathname;
    return pathname === '/auth/token' || pathname === '/auth/token/refresh';
  }

  client.use({
    async onRequest({ request }) {
      if (isAuthPlumbing(request.url)) return undefined;
      const tokens = await getTokens();
      if (!tokens) return undefined;
      const next = request.clone();
      next.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
      return next;
    },
    async onResponse({ request, response }) {
      if (response.status !== 401 || isAuthPlumbing(request.url)) return undefined;

      refreshInFlight ??= refreshTokens().finally(() => {
        refreshInFlight = null;
      });
      const refreshed = await refreshInFlight;

      if (!refreshed) {
        await clearTokens();
        options.onSignOut();
        return response;
      }

      const tokens = await getTokens();
      if (!tokens) return response;
      const retry = request.clone();
      retry.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
      return fetchImpl(retry);
    },
  });

  return client;
}

export type AuthenticatedClient = ReturnType<typeof createAuthenticatedClient>;
