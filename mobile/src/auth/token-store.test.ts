import { clearTokens, getTokens, setTokens } from './token-store';

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => void store.set(k, v)),
    deleteItemAsync: jest.fn(async (k: string) => void store.delete(k)),
  };
});

test('returns null when nothing is stored', async () => {
  expect(await getTokens()).toBeNull();
});

test('round-trips a token pair', async () => {
  await setTokens({ accessToken: 'a1', refreshToken: 'r1' });
  expect(await getTokens()).toEqual({ accessToken: 'a1', refreshToken: 'r1' });
});

test('clearTokens removes both tokens', async () => {
  await setTokens({ accessToken: 'a1', refreshToken: 'r1' });
  await clearTokens();
  expect(await getTokens()).toBeNull();
});
