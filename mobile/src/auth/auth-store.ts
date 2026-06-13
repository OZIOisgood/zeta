import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import i18next from 'i18next';
import type { components } from '../api/schema';
import type { AuthenticatedClient } from '../api/authenticated-client';
import { createAuthenticatedClient } from '../api/authenticated-client';
import { clearTokens, getTokens, setTokens, type TokenPair } from './token-store';

export type Me = components['schemas']['Me'];
export type UpdateMeRequest = components['schemas']['UpdateMeRequest'];
export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

/** Minimal interface the store needs — allows test doubles without full client shape. */
export type AuthenticatedClientLike = Pick<AuthenticatedClient, 'GET' | 'PUT'>;

type AuthState = {
  status: AuthStatus;
  user: Me | null;
  restore: () => Promise<void>;
  signIn: (tokens: TokenPair) => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Update the current user's profile and notification preferences via
   * PUT /auth/me. On success the store's `user` is replaced with the response
   * and, when the language changed, i18next is switched to match (mirrors the
   * web shell.setLanguage). Returns the updated user, or null on failure.
   */
  updateCurrentUser: (body: UpdateMeRequest) => Promise<Me | null>;
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

      updateCurrentUser: async (body: UpdateMeRequest) => {
        const previousLanguage = get().user?.language;
        const { data, error } = await api.PUT('/auth/me' as never, { body } as never);
        if (error || !data) return null;
        const user = data as Me;
        set({ status: 'signedIn', user });
        if (user.language !== previousLanguage) {
          await i18next.changeLanguage(user.language);
        }
        return user;
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
