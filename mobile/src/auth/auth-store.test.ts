import { createAuthStore, isWorkOSLogoutUrl, type AuthenticatedClientLike } from './auth-store';
import { clearTokens, getTokens, setTokens } from './token-store';
import { queryClient } from '../api/query-client';
import * as WebBrowser from 'expo-web-browser';

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => void store.set(k, v)),
    deleteItemAsync: jest.fn(async (k: string) => void store.delete(k)),
  };
});

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(async () => ({ type: 'opened' })),
}));

const ME = {
  id: 'user_1', first_name: 'Heinrich', last_name: 'M', email: 'h@example.test',
  language: 'en', avatar: '', timezone: 'UTC', role: 'student', permissions: ['assets:read'],
  email_preferences: {
    notifications_enabled: true, asset_uploads_enabled: true, asset_reviews_enabled: true,
    invitation_updates_enabled: true, group_membership_updates_enabled: true,
    coaching_booking_updates_enabled: true, coaching_reminders_enabled: true,
  },
};

function clientReturning(me: typeof ME | null) {
  return {
    GET: jest.fn(async () =>
      me ? { data: me, error: undefined } : { data: undefined, error: { message: 'unauthorized' } },
    ),
  };
}

beforeEach(async () => {
  await clearTokens();
  (WebBrowser.openBrowserAsync as jest.Mock).mockClear();
});

test('restore without stored tokens lands on signedOut', async () => {
  const store = createAuthStore(clientReturning(ME) as unknown as AuthenticatedClientLike);
  await store.getState().restore();
  expect(store.getState().status).toBe('signedOut');
  expect(store.getState().user).toBeNull();
});

test('restore with stored tokens loads the user', async () => {
  await setTokens({ accessToken: 'a', refreshToken: 'r' });
  const store = createAuthStore(clientReturning(ME) as unknown as AuthenticatedClientLike);
  await store.getState().restore();
  expect(store.getState().status).toBe('signedIn');
  expect(store.getState().user?.first_name).toBe('Heinrich');
});

test('restore with stored tokens but failing /auth/me lands on signedOut', async () => {
  await setTokens({ accessToken: 'a', refreshToken: 'r' });
  const store = createAuthStore(clientReturning(null) as unknown as AuthenticatedClientLike);
  await store.getState().restore();
  expect(store.getState().status).toBe('signedOut');
  expect(store.getState().user).toBeNull();
});

test('signIn persists tokens and loads the user', async () => {
  const store = createAuthStore(clientReturning(ME) as unknown as AuthenticatedClientLike);
  await store.getState().signIn({ accessToken: 'a', refreshToken: 'r' });
  expect(store.getState().status).toBe('signedIn');
  expect(store.getState().user?.id).toBe('user_1');
});

test('signOut clears tokens and user', async () => {
  await setTokens({ accessToken: 'a', refreshToken: 'r' });
  const store = createAuthStore(clientReturning(ME) as unknown as AuthenticatedClientLike);
  await store.getState().restore();
  await store.getState().signOut();
  expect(store.getState().status).toBe('signedOut');
  expect(store.getState().user).toBeNull();
});

test('clears the query cache on sign-out', async () => {
  const clearSpy = jest.spyOn(queryClient, 'clear');
  clearSpy.mockClear(); // robust against any prior signOut in the suite
  const client = {
    GET: jest.fn(async () => ({ data: ME, error: undefined })),
    POST: jest.fn(async () => ({
      data: { logoutUrl: 'https://api.workos.com/user_management/sessions/logout?session_id=x' },
      error: undefined,
    })),
  };
  const store = createAuthStore(client as unknown as AuthenticatedClientLike);
  await store.getState().signOut();
  expect(clearSpy).toHaveBeenCalledTimes(1);
  clearSpy.mockRestore();
});

test('restore with network failure keeps tokens but settles to signedOut', async () => {
  await setTokens({ accessToken: 'a', refreshToken: 'r' });
  const throwingClient = {
    GET: jest.fn(async () => {
      throw new TypeError('Network request failed');
    }),
  };
  const store = createAuthStore(throwingClient as unknown as AuthenticatedClientLike);
  await expect(store.getState().restore()).resolves.toBeUndefined();
  expect(store.getState().status).toBe('signedOut');
  expect(await getTokens()).toEqual({ accessToken: 'a', refreshToken: 'r' });
});

test('signIn with network failure clears tokens and rethrows', async () => {
  const throwingClient = {
    GET: jest.fn(async () => {
      throw new TypeError('Network request failed');
    }),
  };
  const store = createAuthStore(throwingClient as unknown as AuthenticatedClientLike);
  await expect(
    store.getState().signIn({ accessToken: 'a', refreshToken: 'r' }),
  ).rejects.toThrow('Network request failed');
  expect(store.getState().status).toBe('signedOut');
  expect(await getTokens()).toBeNull();
});

// ── signOut hits /auth/logout before clearing ─────────────────────────────────

function logoutClient(result: { data?: { logoutUrl: string }; error?: unknown }) {
  return {
    GET: jest.fn(async () => ({ data: ME, error: undefined })),
    POST: jest.fn(async () => result),
  };
}

const WORKOS_LOGOUT_URL =
  'https://api.workos.com/user_management/sessions/logout?session_id=session_1';

test('signOut posts to /auth/logout and opens the returned logout URL when it is a WorkOS URL', async () => {
  await setTokens({ accessToken: 'a', refreshToken: 'r' });
  const client = logoutClient({ data: { logoutUrl: WORKOS_LOGOUT_URL } });
  const store = createAuthStore(client as unknown as AuthenticatedClientLike);
  await store.getState().signOut();

  expect(client.POST).toHaveBeenCalledWith('/auth/logout');
  expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(WORKOS_LOGOUT_URL);
  expect(store.getState().status).toBe('signedOut');
  expect(store.getState().user).toBeNull();
  expect(await getTokens()).toBeNull();
});

test('signOut still clears locally when the logout call returns an error', async () => {
  await setTokens({ accessToken: 'a', refreshToken: 'r' });
  const client = logoutClient({ data: undefined, error: { message: 'boom' } });
  const store = createAuthStore(client as unknown as AuthenticatedClientLike);
  await store.getState().signOut();

  expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
  expect(store.getState().status).toBe('signedOut');
  expect(await getTokens()).toBeNull();
});

test('signOut still clears locally when the logout call throws (offline)', async () => {
  await setTokens({ accessToken: 'a', refreshToken: 'r' });
  const throwing = {
    GET: jest.fn(async () => ({ data: ME, error: undefined })),
    POST: jest.fn(async () => {
      throw new TypeError('Network request failed');
    }),
  };
  const store = createAuthStore(throwing as unknown as AuthenticatedClientLike);
  await expect(store.getState().signOut()).resolves.toBeUndefined();

  expect(store.getState().status).toBe('signedOut');
  expect(store.getState().user).toBeNull();
  expect(await getTokens()).toBeNull();
});

// ── isWorkOSLogoutUrl guard ───────────────────────────────────────────────────

test('signOut does NOT open browser when server returns the plain frontend URL', async () => {
  // This is the pre-fix fallback: server has no SID and returns FRONTEND_URL.
  await setTokens({ accessToken: 'a', refreshToken: 'r' });
  const client = logoutClient({ data: { logoutUrl: 'https://app.example.com' } });
  const store = createAuthStore(client as unknown as AuthenticatedClientLike);
  await store.getState().signOut();

  expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
  expect(store.getState().status).toBe('signedOut');
  expect(await getTokens()).toBeNull();
});

describe('isWorkOSLogoutUrl', () => {
  test.each([
    ['WorkOS logout URL', 'https://api.workos.com/user_management/sessions/logout?session_id=x', true],
    ['WorkOS logout URL without query', 'https://api.workos.com/user_management/sessions/logout', true],
    ['plain frontend URL', 'https://app.example.com', false],
    ['frontend URL with path', 'https://app.example.com/dashboard', false],
    ['workos.com but wrong path', 'https://api.workos.com/sso/something', false],
    ['invalid/empty string', '', false],
    ['relative path', '/logout', false],
  ])('%s → %s', (_label, url, expected) => {
    expect(isWorkOSLogoutUrl(url)).toBe(expected);
  });
});
