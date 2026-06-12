import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { components } from '../api/schema';
import type { AuthenticatedClient } from '../api/authenticated-client';
import { createAuthenticatedClient } from '../api/authenticated-client';
import { clearTokens, getTokens, setTokens, type TokenPair } from './token-store';

export type Me = components['schemas']['Me'];
export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

/** Minimal interface the store needs — allows test doubles without full client shape. */
export type AuthenticatedClientLike = Pick<AuthenticatedClient, 'GET'>;

type AuthState = {
  status: AuthStatus;
  user: Me | null;
  restore: () => Promise<void>;
  signIn: (tokens: TokenPair) => Promise<void>;
  signOut: () => Promise<void>;
};

export function createAuthStore(client?: AuthenticatedClientLike) {
  const store = createStore<AuthState>((set, get) => {
    const api: AuthenticatedClientLike =
      client ??
      createAuthenticatedClient({
        onSignOut: () => {
          set({ status: 'signedOut', user: null });
        },
      });

    async function loadUser(): Promise<boolean> {
      const { data, error } = await api.GET('/auth/me' as never);
      if (error || !data) return false;
      set({ status: 'signedIn', user: data as Me });
      return true;
    }

    return {
      status: 'loading',
      user: null,

      restore: async () => {
        const tokens = await getTokens();
        if (!tokens) {
          set({ status: 'signedOut', user: null });
          return;
        }
        try {
          const ok = await loadUser();
          if (!ok && get().status !== 'signedOut') {
            await clearTokens();
            set({ status: 'signedOut', user: null });
          }
        } catch {
          // Network failure: keep tokens so the session survives transient outages; the next launch retries.
          set({ status: 'signedOut', user: null });
        }
      },

      signIn: async (tokens: TokenPair) => {
        await setTokens(tokens);
        try {
          const ok = await loadUser();
          if (!ok) {
            await clearTokens();
            set({ status: 'signedOut', user: null });
          }
        } catch (err) {
          await clearTokens();
          set({ status: 'signedOut', user: null });
          throw err;
        }
      },

      signOut: async () => {
        await clearTokens();
        set({ status: 'signedOut', user: null });
      },
    };
  });

  return store;
}

function handleSignOut() {
  authStore.setState({ status: 'signedOut', user: null });
}

/**
 * Shared authenticated client. Lives in this module (not api/) because its
 * onSignOut must flip the auth store — colocating avoids an import cycle.
 */
export const api = createAuthenticatedClient({ onSignOut: handleSignOut });

export const authStore = createAuthStore(api);

export function useAuth<T>(selector: (state: AuthState) => T): T {
  return useStore(authStore, selector);
}
