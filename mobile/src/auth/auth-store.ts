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
        const ok = await loadUser();
        if (!ok && get().status !== 'signedOut') {
          await clearTokens();
          set({ status: 'signedOut', user: null });
        }
      },

      signIn: async (tokens: TokenPair) => {
        await setTokens(tokens);
        const ok = await loadUser();
        if (!ok) {
          await clearTokens();
          set({ status: 'signedOut', user: null });
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

export const authStore = createAuthStore();

export function useAuth<T>(selector: (state: AuthState) => T): T {
  return useStore(authStore, selector);
}
