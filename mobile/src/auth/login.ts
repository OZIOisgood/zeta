import * as SecureStore from 'expo-secure-store';
import { createApiClient } from '../api/client';
import { authStore } from './auth-store';
import type { TokenPair } from './token-store';

/** AuthKit via WorkOS User Management; PKCE is handled by expo-auth-session. */
export const workosDiscovery = {
  authorizationEndpoint: 'https://api.workos.com/user_management/authorize',
};

export function workosClientId(): string {
  const id = process.env.EXPO_PUBLIC_WORKOS_CLIENT_ID ?? '';
  if (!id && __DEV__) {
    console.warn('EXPO_PUBLIC_WORKOS_CLIENT_ID is not set — sign-in will fail.');
  }
  return id;
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

const VERIFIER_KEY = 'zeta.pkceVerifier';

/**
 * Persists the PKCE code verifier before the browser opens. In Expo Go the
 * AuthKit redirect can reload the whole project (fresh JS context), which
 * destroys the in-memory auth session — the stashed verifier lets the
 * auth/callback route finish the exchange after such a reload.
 */
export async function stashCodeVerifier(verifier: string): Promise<void> {
  await SecureStore.setItemAsync(VERIFIER_KEY, verifier);
}

let completing: Promise<boolean> | null = null;

/**
 * Completes the PKCE login with the authorization code from the AuthKit
 * redirect. Two call sites can race: the login screen (when the redirect
 * resumes the running app) and the auth/callback route (when Expo Go reloads
 * the project). The single-flight guard plus consuming the stashed verifier
 * make the second caller a no-op; the code is single-use at WorkOS anyway.
 * Returns true when this call established the session.
 */
export async function completeLogin(code: string): Promise<boolean> {
  completing ??= (async () => {
    try {
      const verifier = await SecureStore.getItemAsync(VERIFIER_KEY);
      if (!verifier) return false;
      await SecureStore.deleteItemAsync(VERIFIER_KEY);
      const tokens = await exchangeCode(code, verifier);
      await authStore.getState().signIn(tokens);
      return true;
    } finally {
      completing = null;
    }
  })();
  return completing;
}
