import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import i18next from 'i18next';
import * as WebBrowser from 'expo-web-browser';
import type { components } from '../api/schema';
import type { AuthenticatedClient } from '../api/authenticated-client';
import { createAuthenticatedClient } from '../api/authenticated-client';
import { queryClient } from '../api/query-client';
import { clearTokens, getTokens, setTokens, type TokenPair } from './token-store';

export type Me = components['schemas']['Me'];
export type UpdateMeRequest = components['schemas']['UpdateMeRequest'];
export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

/** Minimal interface the store needs — allows test doubles without full client shape. */
export type AuthenticatedClientLike = Pick<AuthenticatedClient, 'GET' | 'PUT' | 'POST'>;

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
        // POST /auth/logout so the server revokes the WorkOS session server-side.
        // The stored access token is attached as a Bearer header by the authenticated
        // client, which gives the server the SID it needs to call WorkOS.
        // The response carries a logoutUrl; we open it in a browser ONLY when it is
        // an actual WorkOS session-logout URL (contains the WorkOS logout path).
        // If the server fell back to the plain FRONTEND_URL (no session to revoke,
        // or the server was unreachable) we skip the browser open and rely on
        // local teardown. Best-effort: any failure must still clear tokens locally.
        //
        // openAuthSessionAsync (not openBrowserAsync): the tab dismisses itself
        // as soon as WorkOS redirects to LOGOUT_RETURN_URL (backend
        // MOBILE_LOGOUT_RETURN_TO + WorkOS logout-redirect whitelist). Without
        // that config WorkOS redirects to its dashboard default and the user
        // closes the tab manually — no worse than openBrowserAsync.
        try {
          const { data, error } = await api.POST('/auth/logout' as never);
          const logoutUrl = (data as { logoutUrl?: string } | undefined)?.logoutUrl;
          if (!error && logoutUrl && isWorkOSLogoutUrl(logoutUrl)) {
            await WebBrowser.openAuthSessionAsync(logoutUrl, LOGOUT_RETURN_URL);
          }
        } catch {
          // Swallow: local teardown below is the source of truth for sign-out.
        }
        await clearTokens();
        queryClient.clear();
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

/**
 * Post-logout deep link the WorkOS logout redirect lands on. Literal `zeta://`
 * (the app.json scheme) rather than expo-auth-session's makeRedirectUri: the
 * store is not a component, and Expo Go's exp:// URIs cannot be whitelisted as
 * WorkOS logout redirect URIs anyway. Routes to /login, which already exists.
 */
export const LOGOUT_RETURN_URL = 'zeta://login';

/**
 * Returns true only when `url` is a genuine WorkOS session-logout URL
 * (i.e. the path produced by the WorkOS SDK's GetLogoutURL).
 * The backend falls back to the plain FRONTEND_URL when no session ID is
 * available, so we must distinguish the two before opening a browser tab.
 */
export function isWorkOSLogoutUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.pathname.includes('/user_management/sessions/logout');
  } catch {
    return false;
  }
}

function handleSignOut() {
  queryClient.clear();
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
