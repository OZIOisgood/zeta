import createClient from 'openapi-fetch';
import type { paths } from './schema';

export type ApiClient = ReturnType<typeof createApiClient>;

const DEFAULT_BASE_URL = 'http://localhost:8080';

/**
 * Creates the typed Zeta API client. Auth (Bearer header + refresh) is layered
 * on via middleware in the auth work package — this factory stays transport-only.
 */
export function createApiClient(options?: { baseUrl?: string; fetch?: typeof fetch }) {
  return createClient<paths>({
    baseUrl: options?.baseUrl ?? process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE_URL,
    fetch: options?.fetch,
  });
}
