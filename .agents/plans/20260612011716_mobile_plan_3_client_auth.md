# Mobile Plan 3: Client Auth (PKCE Login, Token Handling, Auth Gate) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The mobile app can sign in via WorkOS AuthKit (PKCE in the system browser), stores the token pair in secure storage, transparently refreshes on 401, gates the tab shell behind authentication, shows the real `/auth/me` profile, and signs out.

**Architecture:** A `src/auth/` module owns the credential lifecycle: `token-store.ts` (expo-secure-store wrapper) → `authenticated client` (openapi-fetch middleware: Bearer injection + single-flight 401-refresh-retry) → `auth-store.ts` (Zustand: `loading/signedOut/signedIn` + `restore/signIn/signOut`) → router gate (`Stack.Protected` in the root layout) + `login.tsx` (expo-auth-session `useAuthRequest` against WorkOS authorize endpoint, code exchange via `POST /auth/token`). Logout is local-only in v1 (clear tokens); WorkOS session revocation is a documented follow-up.

**Tech Stack:** expo-auth-session + expo-crypto + expo-web-browser (PKCE), expo-secure-store, zustand, openapi-fetch middleware (`client.use`), existing jest 29 + RNTL 14 (async `render`).

**Parent spec:** `.agents/plans/20260611225227_mobile_app_react_native_expo_design.md`
**Predecessors:** Plan 1 (token endpoints, PR #15), Plan 2 (app skeleton, same PR). Work continues on branch `feat/mobile-token-auth` (same PR #15, user decision).

**Manual prerequisite (user, NOT the executor):** register the redirect URI `zeta://auth/callback` in the WorkOS dashboard. Implementation and all tests work without it; only the E2E login on a device needs it.

**Conventions for every task:**
- Shell via `wsl.exe -d ubuntu --cd /home/heinrich/dev/projects/zeta -- bash -c "..."`; pnpm fallbacks `bash -ic`/`corepack pnpm`; installs timeout 600000. File edits via `\\wsl.localhost\ubuntu\home\heinrich\dev\projects\zeta`.
- RNTL 14: `await render(...)`. jest-expo node env has native fetch/Response (Node 24).
- Per task: `cd mobile && pnpm run test && pnpm exec tsc --noEmit && pnpm run lint` must be green before commit.
- Commit per task, Conventional Commits, no `Co-Authored-By`, never `git add -A`.

---

## File Structure (end state)

```
mobile/
  .env.example              EXPO_PUBLIC_API_URL, EXPO_PUBLIC_WORKOS_CLIENT_ID
  src/
    auth/
      token-store.ts        SecureStore wrapper (get/set/clear token pair)
      token-store.test.ts
      auth-store.ts         Zustand store: status, user, restore/signIn/signOut
      auth-store.test.ts
      login.ts              WorkOS authorize discovery + exchangeCode()
      login.test.ts
    api/
      client.ts             (Plan 2) + createAuthenticatedClient with middleware
      authenticated-client.ts
      authenticated-client.test.ts
  src/app/
    _layout.tsx             Stack.Protected auth gate + restore-on-launch
    login.tsx               login screen (ZButton → useAuthRequest → exchange)
    (tabs)/profile.tsx      real /auth/me data + sign-out button
```

---

### Task 1: Secure token store

**Files:**
- Create: `mobile/src/auth/token-store.ts`, `mobile/src/auth/token-store.test.ts`
- Install: expo-secure-store, zustand (zustand used from Task 3; install once here)

- [ ] **Step 1: Install**

```bash
cd mobile && pnpm exec expo install expo-secure-store && pnpm add zustand
```

- [ ] **Step 2: Failing tests** `mobile/src/auth/token-store.test.ts`:

```ts
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
```

Run → FAIL (module not found).

- [ ] **Step 3: Implement** `mobile/src/auth/token-store.ts`:

```ts
import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'zeta.accessToken';
const REFRESH_KEY = 'zeta.refreshToken';

export type TokenPair = { accessToken: string; refreshToken: string };

export async function getTokens(): Promise<TokenPair | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
  ]);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function setTokens(tokens: TokenPair): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ]);
}
```

- [ ] **Step 4: Verify + commit**

```bash
cd mobile && pnpm run test && pnpm exec tsc --noEmit && pnpm run lint
git add mobile/src/auth/ mobile/package.json mobile/pnpm-lock.yaml mobile/app.json
git commit -m "feat(mobile): add secure token store"
```
(`app.json` only if `expo install` added a plugin entry.)

---

### Task 2: Authenticated client (Bearer + single-flight 401 refresh)

**Files:**
- Create: `mobile/src/api/authenticated-client.ts`, `mobile/src/api/authenticated-client.test.ts`

The middleware contract (openapi-fetch `client.use`): `onRequest({ request })` may return a modified `Request`; `onResponse({ request, response })` may return a replacement `Response`. Verify the exact hook signatures against the installed openapi-fetch 0.17 (`node_modules/openapi-fetch/README` or its types) and adapt minimally.

- [ ] **Step 1: Failing tests** `mobile/src/api/authenticated-client.test.ts`:

```ts
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
```

Run → FAIL (module not found).

- [ ] **Step 2: Implement** `mobile/src/api/authenticated-client.ts`:

```ts
import createClient from 'openapi-fetch';
import type { paths } from './schema';
import { clearTokens, getTokens, setTokens } from '../auth/token-store';

const DEFAULT_BASE_URL = 'http://localhost:8080';

type Options = {
  baseUrl?: string;
  fetch?: typeof fetch;
  /** Called when a 401 cannot be recovered by refreshing — the session is gone. */
  onSignOut: () => void;
};

/**
 * Typed client with credential handling: injects the stored access token as
 * a Bearer header and, on 401, performs a single-flight refresh and retries
 * the original request once. The /auth/token* endpoints themselves are never
 * intercepted (they are the credential plumbing).
 */
export function createAuthenticatedClient(options: Options) {
  const baseUrl = options.baseUrl ?? process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE_URL;
  const fetchImpl = options.fetch ?? fetch;
  const client = createClient<paths>({ baseUrl, fetch: fetchImpl });

  let refreshInFlight: Promise<boolean> | null = null;

  async function refreshTokens(): Promise<boolean> {
    const current = await getTokens();
    if (!current) return false;
    const response = await fetchImpl(
      new Request(`${baseUrl}/auth/token/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: current.refreshToken }),
      }),
    );
    if (!response.ok) return false;
    const pair = (await response.json()) as { access_token: string; refresh_token: string };
    await setTokens({ accessToken: pair.access_token, refreshToken: pair.refresh_token });
    return true;
  }

  function isAuthPlumbing(url: string): boolean {
    const pathname = new URL(url).pathname;
    return pathname === '/auth/token' || pathname === '/auth/token/refresh';
  }

  client.use({
    async onRequest({ request }) {
      if (isAuthPlumbing(request.url)) return request;
      const tokens = await getTokens();
      if (!tokens) return request;
      const next = new Request(request);
      next.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
      return next;
    },
    async onResponse({ request, response }) {
      if (response.status !== 401 || isAuthPlumbing(request.url)) return response;

      refreshInFlight ??= refreshTokens().finally(() => {
        refreshInFlight = null;
      });
      const refreshed = await refreshInFlight;

      if (!refreshed) {
        await clearTokens();
        options.onSignOut();
        return response;
      }

      const tokens = await getTokens();
      if (!tokens) return response;
      const retry = new Request(request);
      retry.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
      return fetchImpl(retry);
    },
  });

  return client;
}

export type AuthenticatedClient = ReturnType<typeof createAuthenticatedClient>;
```

CAVEAT for the implementer: openapi-fetch consumes the request body when it builds the `Request`. Retrying with `new Request(request)` re-uses the (possibly already-read) body — for GET requests this is irrelevant; for POST retries the body stream may be locked. If the retry test for a body-carrying request fails, use `request.clone()` BEFORE the first send (clone in `onRequest`) per openapi-fetch's retry guidance. The tests above only retry GETs — keep scope; document the POST-retry limitation in a code comment.

- [ ] **Step 3: Verify + commit**

```bash
cd mobile && pnpm run test && pnpm exec tsc --noEmit && pnpm run lint
git add mobile/src/api/
git commit -m "feat(mobile): add authenticated client with bearer and refresh middleware"
```

---

### Task 3: Auth store (Zustand)

**Files:**
- Create: `mobile/src/auth/auth-store.ts`, `mobile/src/auth/auth-store.test.ts`

- [ ] **Step 1: Failing tests** `mobile/src/auth/auth-store.test.ts`:

```ts
import { createAuthStore } from './auth-store';
import { setTokens } from './token-store';

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

test('restore without stored tokens lands on signedOut', async () => {
  const store = createAuthStore(clientReturning(ME) as never);
  await store.getState().restore();
  expect(store.getState().status).toBe('signedOut');
  expect(store.getState().user).toBeNull();
});

test('restore with stored tokens loads the user', async () => {
  await setTokens({ accessToken: 'a', refreshToken: 'r' });
  const store = createAuthStore(clientReturning(ME) as never);
  await store.getState().restore();
  expect(store.getState().status).toBe('signedIn');
  expect(store.getState().user?.first_name).toBe('Heinrich');
});

test('signIn persists tokens and loads the user', async () => {
  const store = createAuthStore(clientReturning(ME) as never);
  await store.getState().signIn({ accessToken: 'a', refreshToken: 'r' });
  expect(store.getState().status).toBe('signedIn');
  expect(store.getState().user?.id).toBe('user_1');
});

test('signOut clears tokens and user', async () => {
  await setTokens({ accessToken: 'a', refreshToken: 'r' });
  const store = createAuthStore(clientReturning(ME) as never);
  await store.getState().restore();
  await store.getState().signOut();
  expect(store.getState().status).toBe('signedOut');
  expect(store.getState().user).toBeNull();
});
```

Run → FAIL.

- [ ] **Step 2: Implement** `mobile/src/auth/auth-store.ts`:

```ts
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { components } from '../api/schema';
import type { AuthenticatedClient } from '../api/authenticated-client';
import { createAuthenticatedClient } from '../api/authenticated-client';
import { clearTokens, getTokens, setTokens, type TokenPair } from './token-store';

export type Me = components['schemas']['Me'];
export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type AuthState = {
  status: AuthStatus;
  user: Me | null;
  restore: () => Promise<void>;
  signIn: (tokens: TokenPair) => Promise<void>;
  signOut: () => Promise<void>;
};

export function createAuthStore(client?: AuthenticatedClient) {
  const store = createStore<AuthState>((set, get) => {
    const api =
      client ??
      createAuthenticatedClient({
        onSignOut: () => {
          set({ status: 'signedOut', user: null });
        },
      });

    async function loadUser(): Promise<boolean> {
      const { data, error } = await api.GET('/auth/me');
      if (error || !data) return false;
      set({ status: 'signedIn', user: data });
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
```

- [ ] **Step 3: Verify + commit**

```bash
cd mobile && pnpm run test && pnpm exec tsc --noEmit && pnpm run lint
git add mobile/src/auth/
git commit -m "feat(mobile): add auth store with restore, sign-in and sign-out"
```

---

### Task 4: PKCE login (WorkOS authorize + code exchange) and login screen

**Files:**
- Create: `mobile/src/auth/login.ts`, `mobile/src/auth/login.test.ts`, `mobile/src/app/login.tsx`, `mobile/.env.example`
- Install: expo-auth-session, expo-crypto, expo-web-browser

- [ ] **Step 1: Install**

```bash
cd mobile && pnpm exec expo install expo-auth-session expo-crypto expo-web-browser
```

- [ ] **Step 2: `mobile/.env.example`** (and verify `.env` is in `mobile/.gitignore` — the Expo template ignores `.env*.local`; ADD `.env` if missing):

```bash
# Copy to .env for local development. EXPO_PUBLIC_* values are public client config.
EXPO_PUBLIC_API_URL=http://localhost:8080
EXPO_PUBLIC_WORKOS_CLIENT_ID=client_xxx
```

- [ ] **Step 3: Failing test** `mobile/src/auth/login.test.ts` (tests the exchange function only — the browser hook is untestable in jest):

```ts
import { exchangeCode, workosDiscovery } from './login';

test('discovery points at the WorkOS user management authorize endpoint', () => {
  expect(workosDiscovery.authorizationEndpoint).toBe(
    'https://api.workos.com/user_management/authorize',
  );
});

test('exchangeCode posts code and verifier and returns the token pair', async () => {
  const calls: Array<{ url: string; body: unknown }> = [];
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
```

Run → FAIL.

- [ ] **Step 4: Implement** `mobile/src/auth/login.ts`:

```ts
import { createApiClient } from '../api/client';
import type { TokenPair } from './token-store';

/** AuthKit via WorkOS User Management; PKCE is handled by expo-auth-session. */
export const workosDiscovery = {
  authorizationEndpoint: 'https://api.workos.com/user_management/authorize',
};

export function workosClientId(): string {
  return process.env.EXPO_PUBLIC_WORKOS_CLIENT_ID ?? '';
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
```

- [ ] **Step 5: Login screen** `mobile/src/app/login.tsx`:

```tsx
import { useState } from 'react';
import { Text, View } from 'react-native';
import { makeRedirectUri, ResponseType, useAuthRequest } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { ZButton } from '../components/ui/z-button';
import { exchangeCode, workosClientId, workosDiscovery } from '../auth/login';
import { authStore } from '../auth/auth-store';

WebBrowser.maybeCompleteAuthSession();

const redirectUri = makeRedirectUri({ scheme: 'zeta', path: 'auth/callback' });

export default function LoginScreen() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const [request, , promptAsync] = useAuthRequest(
    {
      clientId: workosClientId(),
      redirectUri,
      responseType: ResponseType.Code,
      usePKCE: true,
      scopes: [],
      extraParams: { provider: 'authkit' },
    },
    workosDiscovery,
  );

  async function signIn() {
    if (!request) return;
    setBusy(true);
    setFailed(false);
    try {
      const result = await promptAsync();
      if (result.type !== 'success' || !result.params.code || !request.codeVerifier) {
        if (result.type !== 'cancel' && result.type !== 'dismiss') setFailed(true);
        return;
      }
      const tokens = await exchangeCode(result.params.code, request.codeVerifier);
      await authStore.getState().signIn(tokens);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-z-bg px-8">
      <Text className="text-3xl font-bold text-z-text">Zeta</Text>
      <Text className="text-center text-z-muted">
        Digital video coaching — sign in to continue.
      </Text>
      <View className="w-full">
        <ZButton label={busy ? 'Signing in…' : 'Sign in'} onPress={signIn} disabled={busy || !request} />
      </View>
      {failed ? <Text className="text-z-danger">Sign-in failed. Please try again.</Text> : null}
    </View>
  );
}
```

(English literals are acceptable — the dashboard has no auth-screen keys; noted as i18n follow-up. Strict-TS note: the unused middle tuple element of `useAuthRequest` is skipped with a hole, which TS allows in array destructuring.)

- [ ] **Step 6: Verify + commit**

```bash
cd mobile && pnpm run test && pnpm exec tsc --noEmit && pnpm run lint
git add mobile/src/auth/ mobile/src/app/login.tsx mobile/.env.example mobile/.gitignore mobile/package.json mobile/pnpm-lock.yaml mobile/app.json
git commit -m "feat(mobile): add PKCE login flow against WorkOS AuthKit"
```

---

### Task 5: Auth gate in the router + real profile screen

**Files:**
- Modify: `mobile/src/app/_layout.tsx`, `mobile/src/app/(tabs)/profile.tsx`
- Create: `mobile/src/app/(tabs)/profile.test.tsx`

- [ ] **Step 1: Root layout with gate** `mobile/src/app/_layout.tsx`:

```tsx
import '../../global.css';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { initI18n } from '../i18n';
import { authStore, useAuth } from '../auth/auth-store';

void initI18n();

export default function RootLayout() {
  const status = useAuth((s) => s.status);

  useEffect(() => {
    void authStore.getState().restore();
  }, []);

  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-z-bg">
        <ActivityIndicator size="large" color="#ea580c" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'signedIn'}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={status !== 'signedIn'}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}
```

(`Stack.Protected` exists in expo-router since SDK 53; verify it's exported in the installed version — `grep -r "Protected" node_modules/expo-router/build/index.d.ts`. If absent, use the `<Redirect href="/login" />` pattern inside `(tabs)/_layout.tsx` instead and note the deviation.)

- [ ] **Step 2: Failing test** `mobile/src/app/(tabs)/profile.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

import { authStore } from '../../auth/auth-store';
import ProfileScreen from './profile';

const ME = {
  id: 'user_1', first_name: 'Heinrich', last_name: 'Mergel', email: 'h@example.test',
  language: 'en', avatar: '', timezone: 'Europe/Berlin', role: 'student', permissions: [],
  email_preferences: {
    notifications_enabled: true, asset_uploads_enabled: true, asset_reviews_enabled: true,
    invitation_updates_enabled: true, group_membership_updates_enabled: true,
    coaching_booking_updates_enabled: true, coaching_reminders_enabled: true,
  },
};

test('shows the signed-in user and a sign-out button', async () => {
  authStore.setState({ status: 'signedIn', user: ME });
  await render(<ProfileScreen />);

  expect(screen.getByText('Heinrich Mergel')).toBeOnTheScreen();
  expect(screen.getByText('h@example.test')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeOnTheScreen();
});
```

Run → FAIL (profile is still the placeholder).

- [ ] **Step 3: Implement** `mobile/src/app/(tabs)/profile.tsx`:

```tsx
import { Text, View } from 'react-native';
import { ZButton } from '../../components/ui/z-button';
import { authStore, useAuth } from '../../auth/auth-store';

export default function ProfileScreen() {
  const user = useAuth((s) => s.user);

  if (!user) return null;

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-z-bg px-8">
      <Text className="text-xl font-semibold text-z-text">
        {user.first_name} {user.last_name}
      </Text>
      <Text className="text-z-muted">{user.email}</Text>
      <Text className="text-z-muted">{user.role}</Text>
      <View className="w-full pt-4">
        <ZButton
          label="Sign out"
          variant="secondary"
          onPress={() => void authStore.getState().signOut()}
        />
      </View>
    </View>
  );
}
```

(Sign-out is local-only in v1 — tokens are deleted; the short-lived WorkOS access token simply expires. Server-side session revocation is a documented follow-up.)

- [ ] **Step 4: Verify + commit**

```bash
cd mobile && pnpm run test && pnpm exec tsc --noEmit && pnpm run lint
pnpm exec expo export --platform web --output-dir /tmp/zeta-export-p3 && rm -rf /tmp/zeta-export-p3
git add mobile/src/app/
git commit -m "feat(mobile): gate the app behind auth and show the real profile"
```

---

### Task 6: Docs + final verification

**Files:**
- Modify: `mobile/README.md` (auth section), root `README.md` (mobile auth note in the Auth Flow section)

- [ ] **Step 1: `mobile/README.md`** — add after the Development section:

```markdown
## Authentication

Sign-in uses WorkOS AuthKit via PKCE in the system browser (`expo-auth-session`).
Copy `.env.example` to `.env` and set `EXPO_PUBLIC_WORKOS_CLIENT_ID`. The
redirect URI `zeta://auth/callback` must be registered in the WorkOS dashboard.
Tokens live in `expo-secure-store`; the API client refreshes them on 401
automatically. Sign-out is local (token deletion) — server-side session
revocation is a follow-up.
```

- [ ] **Step 2: Root `README.md`** — in the Auth Flow section's mobile bullet, append one sentence: `The mobile app implements this flow with expo-auth-session (PKCE) and stores tokens in secure storage.`

- [ ] **Step 3: Full verification**

```bash
bash -ic "make mobile:lint && make mobile:typecheck && make mobile:test && make api:openapi:lint"
/usr/local/go/bin/go test ./... -count=1
```
All green.

- [ ] **Step 4: Commit**

```bash
git add mobile/README.md README.md
git commit -m "docs(mobile): document the client auth flow"
```

---

## Out of Scope (later plans)

- Server-side logout/session revocation; account deletion (compliance plan).
- TanStack Query adoption (arrives with the first data-heavy feature: Videos list).
- Login-screen i18n (no dashboard keys exist; needs new keys added dashboard-side first).
- E2E login on a device (needs the WorkOS dashboard redirect-URI registration + `make mobile:start`).

## Verification Checklist (end of plan)

- [ ] `make mobile:lint` / `mobile:typecheck` / `mobile:test` green (≥12 tests)
- [ ] `expo export` bundles login + gated tabs
- [ ] Go suite + OpenAPI lint untouched and green
- [ ] No tokens logged anywhere; tokens only in SecureStore
