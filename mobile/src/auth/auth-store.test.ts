import { createAuthStore, type AuthenticatedClientLike } from './auth-store';
import { clearTokens, getTokens, setTokens } from './token-store';
import { queryClient } from '../api/query-client';

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => void store.set(k, v)),
    deleteItemAsync: jest.fn(async (k: string) => void store.delete(k)),
  };
});

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
  const store = createAuthStore(); // default client; signOut only touches tokens + cache
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
