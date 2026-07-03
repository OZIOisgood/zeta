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

type RefreshOutcome = 'rotated' | 'rejected' | 'unavailable';

/**
 * Typed client with credential handling: injects the stored access token as
 * a Bearer header and, on 401, performs a single-flight refresh and retries
 * the original request once. The /auth/token* endpoints themselves are never
 * intercepted (they are the credential plumbing). Tokens are cleared and the
 * user signed out only when WorkOS deliberately rejects the refresh token;
 * transient failures keep the pair and surface the original 401.
 *
 * Retry limitation: only the retried request's headers are rebuilt; requests
 * with consumed body streams (POST/PUT) may not be retryable — acceptable for
 * now, the app's reads dominate and writes surface the error to the caller.
 *
 * Known window: a request sent with the old token that 401s after a completed
 * refresh starts one extra rotation with the (current) refresh token. This is
 * bounded — at most one extra refresh per in-flight straggler — and safe with
 * WorkOS rotation since the newest stored token is always used. A
 * generation/epoch guard can eliminate it if rotation churn ever matters.
 */
export function createAuthenticatedClient(options: Options) {
  const baseUrl = options.baseUrl ?? process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE_URL;
  const fetchImpl = options.fetch ?? fetch;
  const client = createClient<paths>({ baseUrl, fetch: fetchImpl });

  let refreshInFlight: Promise<RefreshOutcome> | null = null;

  /**
   * 'rejected' means WorkOS deliberately refused the refresh token — only this
   * outcome may destroy the stored pair. 'unavailable' covers transient
   * failures (network down, 5xx, malformed body); the still-valid refresh
   * token must survive those, so callers just surface the original 401.
   */
  async function refreshTokens(): Promise<RefreshOutcome> {
    const current = await getTokens();
    if (!current) return 'rejected';
    let response: Response;
    try {
      response = await fetchImpl(
        new Request(`${baseUrl}/auth/token/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: current.refreshToken }),
        }),
      );
    } catch {
      return 'unavailable';
    }
    if (response.status === 400 || response.status === 401) return 'rejected';
    if (!response.ok) return 'unavailable';
    const pair = (await response.json()) as { access_token?: string; refresh_token?: string };
    if (!pair.access_token || !pair.refresh_token) return 'unavailable';
    await setTokens({ accessToken: pair.access_token, refreshToken: pair.refresh_token });
    return 'rotated';
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
      const outcome = await refreshInFlight;

      if (outcome === 'rejected') {
        await clearTokens();
        options.onSignOut();
        return response;
      }
      if (outcome === 'unavailable') return response;

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
