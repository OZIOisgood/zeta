jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => void store.set(k, v)),
    deleteItemAsync: jest.fn(async (k: string) => void store.delete(k)),
  };
});

import { completeLogin, exchangeCode, workosDiscovery } from './login';

test('completeLogin without a stashed verifier is a no-op', async () => {
  await expect(completeLogin('code_without_verifier')).resolves.toBe(false);
});

test('discovery points at the WorkOS user management authorize endpoint', () => {
  expect(workosDiscovery.authorizationEndpoint).toBe(
    'https://api.workos.com/user_management/authorize',
  );
});

test('exchangeCode posts code and verifier and returns the token pair', async () => {
  const calls: { url: string; body: unknown }[] = [];
  const fetchSpy: typeof fetch = async (input) => {
    const req = input as Request;
    calls.push({ url: req.url, body: JSON.parse(await req.text()) });
    return new Response(JSON.stringify({ access_token: 'acc', refresh_token: 'ref' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const pair = await exchangeCode('code_1', 'verifier_1', {
    baseUrl: 'https://api.example.test',
    fetch: fetchSpy,
  });

  expect(pair).toEqual({ accessToken: 'acc', refreshToken: 'ref' });
  expect(calls[0].url).toBe('https://api.example.test/auth/token');
  expect(calls[0].body).toEqual({ code: 'code_1', code_verifier: 'verifier_1' });
});

test('exchangeCode throws on a rejected code', async () => {
  const fetchSpy: typeof fetch = async () =>
    new Response('Authentication failed', { status: 401 });

  await expect(
    exchangeCode('bad', 'v', { baseUrl: 'https://api.example.test', fetch: fetchSpy }),
  ).rejects.toThrow('Authentication failed');
});
