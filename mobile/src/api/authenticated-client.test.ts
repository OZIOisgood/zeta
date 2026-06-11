import { createAuthenticatedClient } from './authenticated-client';
import { clearTokens, getTokens, setTokens } from '../auth/token-store';

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => void store.set(k, v)),
    deleteItemAsync: jest.fn(async (k: string) => void store.delete(k)),
  };
});

const BASE = 'https://api.example.test';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(async () => {
  await clearTokens();
  jest.clearAllMocks();
});

test('injects the stored access token as Bearer header', async () => {
  await setTokens({ accessToken: 'acc_1', refreshToken: 'ref_1' });
  const seen: string[] = [];
  const fetchSpy: typeof fetch = async (input) => {
    const req = input as Request;
    seen.push(req.headers.get('Authorization') ?? '');
    return jsonResponse({ status: 'ok' });
  };

  const client = createAuthenticatedClient({ baseUrl: BASE, fetch: fetchSpy, onSignOut: jest.fn() });
  const { error } = await client.GET('/health');

  expect(error).toBeUndefined();
  expect(seen[0]).toBe('Bearer acc_1');
});

test('on 401: refreshes once, persists rotated pair, retries the request', async () => {
  await setTokens({ accessToken: 'acc_old', refreshToken: 'ref_old' });
  const log: string[] = [];
  const fetchSpy: typeof fetch = async (input) => {
    const req = input as Request;
    const url = new URL(req.url);
    if (url.pathname === '/auth/token/refresh') {
      log.push('refresh');
      expect(JSON.parse(await req.text())).toEqual({ refresh_token: 'ref_old' });
      return jsonResponse({ access_token: 'acc_new', refresh_token: 'ref_new' });
    }
    const auth = req.headers.get('Authorization');
    log.push(`me:${auth}`);
    if (auth === 'Bearer acc_old') return jsonResponse({ message: 'unauthorized' }, 401);
    return jsonResponse({
      id: 'user_1', first_name: 'H', last_name: 'M', email: 'h@example.test',
      language: 'en', avatar: '', timezone: 'UTC', role: 'student', permissions: [],
      email_preferences: {
        notifications_enabled: true, asset_uploads_enabled: true, asset_reviews_enabled: true,
        invitation_updates_enabled: true, group_membership_updates_enabled: true,
        coaching_booking_updates_enabled: true, coaching_reminders_enabled: true,
      },
    });
  };

  const onSignOut = jest.fn();
  const client = createAuthenticatedClient({ baseUrl: BASE, fetch: fetchSpy, onSignOut });
  const { data, error } = await client.GET('/auth/me');

  expect(error).toBeUndefined();
  expect(data?.id).toBe('user_1');
  expect(log).toEqual(['me:Bearer acc_old', 'refresh', 'me:Bearer acc_new']);
  expect(await getTokens()).toEqual({ accessToken: 'acc_new', refreshToken: 'ref_new' });
  expect(onSignOut).not.toHaveBeenCalled();
});

test('on 401 with failing refresh: clears tokens and calls onSignOut', async () => {
  await setTokens({ accessToken: 'acc_old', refreshToken: 'ref_dead' });
  const fetchSpy: typeof fetch = async (input) => {
    const req = input as Request;
    if (new URL(req.url).pathname === '/auth/token/refresh') {
      return jsonResponse({ message: 'revoked' }, 401);
    }
    return jsonResponse({ message: 'unauthorized' }, 401);
  };

  const onSignOut = jest.fn();
  const client = createAuthenticatedClient({ baseUrl: BASE, fetch: fetchSpy, onSignOut });
  const { error } = await client.GET('/auth/me');

  expect(error).toBeDefined();
  expect(await getTokens()).toBeNull();
  expect(onSignOut).toHaveBeenCalledTimes(1);
});

test('on 401 with malformed refresh response: clears tokens and calls onSignOut', async () => {
  await setTokens({ accessToken: 'acc_old', refreshToken: 'ref_old' });
  const fetchSpy: typeof fetch = async (input) => {
    const req = input as Request;
    if (new URL(req.url).pathname === '/auth/token/refresh') {
      return jsonResponse({ access_token: '', refresh_token: '' });
    }
    return jsonResponse({ message: 'unauthorized' }, 401);
  };

  const onSignOut = jest.fn();
  const client = createAuthenticatedClient({ baseUrl: BASE, fetch: fetchSpy, onSignOut });
  const { error } = await client.GET('/auth/me');

  expect(error).toBeDefined();
  expect(await getTokens()).toBeNull();
  expect(onSignOut).toHaveBeenCalledTimes(1);
});

test('parallel 401s trigger only one refresh (single-flight)', async () => {
  await setTokens({ accessToken: 'acc_old', refreshToken: 'ref_old' });
  let refreshCalls = 0;
  const fetchSpy: typeof fetch = async (input) => {
    const req = input as Request;
    if (new URL(req.url).pathname === '/auth/token/refresh') {
      refreshCalls += 1;
      await new Promise((r) => setTimeout(r, 20));
      return jsonResponse({ access_token: 'acc_new', refresh_token: 'ref_new' });
    }
    const auth = req.headers.get('Authorization');
    if (auth === 'Bearer acc_old') return jsonResponse({ message: 'unauthorized' }, 401);
    return jsonResponse({ status: 'ok' });
  };

  const client = createAuthenticatedClient({ baseUrl: BASE, fetch: fetchSpy, onSignOut: jest.fn() });
  const [a, b] = await Promise.all([client.GET('/health'), client.GET('/health')]);

  expect(a.error).toBeUndefined();
  expect(b.error).toBeUndefined();
  expect(refreshCalls).toBe(1);
});
