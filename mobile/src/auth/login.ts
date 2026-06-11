import { createApiClient } from '../api/client';
import type { TokenPair } from './token-store';

/** AuthKit via WorkOS User Management; PKCE is handled by expo-auth-session. */
export const workosDiscovery = {
  authorizationEndpoint: 'https://api.workos.com/user_management/authorize',
};

export function workosClientId(): string {
  return process.env.EXPO_PUBLIC_WORKOS_CLIENT_ID ?? '';
}

/** Exchanges the AuthKit authorization code at the Zeta API for a token pair. */
export async function exchangeCode(
  code: string,
  codeVerifier: string,
  options?: { baseUrl?: string; fetch?: typeof fetch },
): Promise<TokenPair> {
  const client = createApiClient(options);
  const { data, error } = await client.POST('/auth/token', {
    body: { code, code_verifier: codeVerifier },
  });
  if (error || !data) {
    throw new Error('Authentication failed');
  }
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}
