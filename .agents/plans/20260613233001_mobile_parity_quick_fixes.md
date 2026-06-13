# Mobile Parity Quick-Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan one task at a time, gating each task on a green test before moving on. Steps use checkbox (`- [ ]`) syntax — tick each only after its command prints the stated output.

**Goal:** Close two web↔mobile parity gaps that landed in the auth/shell slice:
1. **Sign-out terminates the WorkOS session.** Today `authStore.signOut()` only clears local tokens + the query cache; it never calls the existing `POST /auth/logout`. The web ends the session at WorkOS (`shell.component` → logout endpoint → opens the returned `logoutUrl`). Mobile must do the same: call `logout` **while the access token is still present** (so the Bearer header is attached), open the returned `logoutUrl` to kill the WorkOS session, and **still clear locally even if the call fails** (offline must not trap the user signed-in).
2. **The tab bar is permission-gated.** `mobile/src/app/(tabs)/_layout.tsx` renders all five tabs unconditionally. The web shell hides nav items the user lacks permission for (`shell.component.ts:85-93`: Groups gated on `groups:read`, Sessions gated on `coaching:bookings:read`). Mobile must hide the **Groups** and **Coaching** tabs for users without those permissions.

**Architecture:** No backend change and **no contract change** — `POST /auth/logout` (`operationId: logout`, `LogoutResponse { logoutUrl }`) is already in `docs/openapi.yaml:529-540` and already generated into `mobile/src/api/schema.d.ts:303-319` (`operations["logout"]`) + `:528-530` (`LogoutResponse`). This package is **Shape S step 3+4 only**: extend the auth store (the de-facto "logout hook") and edit the Tabs config. No new openapi op, no `generate:api` run, no new hook file.

- **Sign-out:** `authStore.signOut()` gains a `POST('/auth/logout')` call up front. The store's injectable client type (`AuthenticatedClientLike`) currently exposes only `GET`/`PUT`; it gains `POST` so tests can inject a fake. The returned `logoutUrl` is opened with `WebBrowser.openBrowserAsync` (already a dep, already used in `app/login.tsx`). The whole remote step is wrapped so any failure (network, non-2xx, thrown) **falls through to the existing local teardown** (`clearTokens` + `queryClient.clear()` + `set(signedOut)`). The Profile screen's existing `Sign out` `ZButton` is unchanged — it already calls `authStore.getState().signOut()`.
- **Tab gating:** `TabsLayout` reads `useAuth((s) => s.user?.permissions ?? null)` (the established mobile pattern — `coaching.tsx:129`, `index.tsx:50`, `videos.tsx:70`) and conditionally renders the `groups` and `coaching` `<Tabs.Screen>` entries. expo-router only registers screens that are rendered, so an omitted `<Tabs.Screen>` removes both the tab button and the route.

**Tech Stack:** Expo SDK 56 / React Native, expo-router `Tabs`, zustand vanilla store (`zustand/vanilla`), `@tanstack/react-query` (`queryClient.clear()`), `expo-web-browser`, `expo-secure-store` (mocked in tests), `react-i18next`, jest-expo + `@testing-library/react-native` (`renderHook`/`render` are async).

---

## FILE STRUCTURE

| File | Created / Modified | Responsibility |
| --- | --- | --- |
| `mobile/src/auth/auth-store.ts` | Modified | Add `POST` to `AuthenticatedClientLike`; in `signOut`, call `POST /auth/logout` and open the returned `logoutUrl` **before** local teardown; on any failure still tear down locally. |
| `mobile/src/auth/auth-store.test.ts` | Modified | Add cases: signOut posts to `/auth/logout` and opens the URL; signOut still clears tokens + lands signedOut when the logout call throws / returns an error. |
| `mobile/src/app/(tabs)/_layout.tsx` | Modified | Read permissions from `useAuth`; render the `groups` tab only with `groups:read` and the `coaching` tab only with `coaching:bookings:read`. |
| `mobile/src/__tests__/tabs-layout.test.tsx` | Created | Assert the Groups/Coaching tabs are hidden without the permission and shown with it; Home/Videos/Profile always present. |

No new components, no new i18n keys (the `Sign out` button label `common.actions.signOut` and the tab titles already exist).

---

## Task 1 — Sign-out calls `/auth/logout` and opens the WorkOS logout URL

**Files:** `mobile/src/auth/auth-store.ts`, `mobile/src/auth/auth-store.test.ts`

### Context you need before writing code

Current `signOut` (`auth-store.ts:86-90`) — does NOT contact the server:

```ts
signOut: async () => {
  await clearTokens();
  queryClient.clear();
  set({ status: 'signedOut', user: null });
},
```

Current injectable client type (`auth-store.ts:14-15`) — no `POST`:

```ts
/** Minimal interface the store needs — allows test doubles without full client shape. */
export type AuthenticatedClientLike = Pick<AuthenticatedClient, 'GET' | 'PUT'>;
```

Why order matters: `createAuthenticatedClient`'s `onRequest` middleware (`authenticated-client.ts:76-83`) reads the stored access token and sets `Authorization: Bearer …`. If we `clearTokens()` first, the logout request goes out **unauthenticated** and the backend cannot resolve the session cookie/sid. So the call must happen **before** `clearTokens()`.

The backend handler (`internal/auth/handler.go:391-463`) always returns `200` with `{ logoutUrl }` (falling back to `FRONTEND_URL` when it cannot build the WorkOS URL), so the happy path always yields a `logoutUrl` string. Opening it terminates the WorkOS session — same as the web. The open is best-effort; a failed/cancelled browser open must not block local teardown.

### Steps

- [ ] **Write the failing tests first.** Append to `mobile/src/auth/auth-store.test.ts`. Add `import * as WebBrowser from 'expo-web-browser';` to the imports at the top, mock it next to the existing `expo-secure-store` mock, and add the three cases below.

  Add this mock immediately after the existing `jest.mock('expo-secure-store', …)` block (top of file):

  ```ts
  jest.mock('expo-web-browser', () => ({
    openBrowserAsync: jest.fn(async () => ({ type: 'opened' })),
  }));
  ```

  Add this import beside the other top imports:

  ```ts
  import * as WebBrowser from 'expo-web-browser';
  ```

  Then append these tests (the existing `clientReturning` helper only stubs `GET`; these define their own clients with `POST`):

  ```ts
  // ── signOut hits /auth/logout before clearing ─────────────────────────────────

  function logoutClient(result: { data?: { logoutUrl: string }; error?: unknown }) {
    return {
      GET: jest.fn(async () => ({ data: ME, error: undefined })),
      POST: jest.fn(async () => result),
    };
  }

  test('signOut posts to /auth/logout and opens the returned logout URL', async () => {
    await setTokens({ accessToken: 'a', refreshToken: 'r' });
    const client = logoutClient({ data: { logoutUrl: 'https://workos.test/logout?sid=1' } });
    const store = createAuthStore(client as unknown as AuthenticatedClientLike);
    await store.getState().signOut();

    expect(client.POST).toHaveBeenCalledWith('/auth/logout');
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://workos.test/logout?sid=1');
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
  ```

- [ ] **Run the tests — expect FAIL.** The current store has no `POST` on `AuthenticatedClientLike` (TS) and `signOut` never calls `POST`/`openBrowserAsync`.

  ```
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/auth/auth-store.test.ts"
  ```

  Expected: the three new tests fail, e.g.
  ```
  ● signOut posts to /auth/logout and opens the returned logout URL
    expect(jest.fn()).toHaveBeenCalledWith(…)
    Number of calls: 0
  ```
  (`client.POST`/`openBrowserAsync` never invoked; the existing five `signOut`/`restore`/`signIn` tests still pass.)

- [ ] **Minimal implementation.** Edit `mobile/src/auth/auth-store.ts`.

  Add the import at the top, beside the other imports:

  ```ts
  import * as WebBrowser from 'expo-web-browser';
  ```

  Widen the injectable client type (line 14-15) to include `POST`:

  ```ts
  /** Minimal interface the store needs — allows test doubles without full client shape. */
  export type AuthenticatedClientLike = Pick<AuthenticatedClient, 'GET' | 'PUT' | 'POST'>;
  ```

  Replace the `signOut` implementation (lines 86-90) with:

  ```ts
  signOut: async () => {
    // End the WorkOS session first, while the access token still exists so the
    // client attaches the Bearer header. Mirrors the web shell logout, which
    // opens the returned logoutUrl. Best-effort: any failure (offline, non-2xx,
    // thrown) must still clear the session locally so the user is not trapped.
    try {
      const { data, error } = await api.POST('/auth/logout' as never);
      const logoutUrl = (data as { logoutUrl?: string } | undefined)?.logoutUrl;
      if (!error && logoutUrl) {
        await WebBrowser.openBrowserAsync(logoutUrl);
      }
    } catch {
      // Swallow: local teardown below is the source of truth for sign-out.
    }
    await clearTokens();
    queryClient.clear();
    set({ status: 'signedOut', user: null });
  },
  ```

  > Note on `as never`: the codegen types `POST('/auth/logout')` with no request body (no `requestBody` in the op), so `api.POST('/auth/logout')` is already valid; the `as never` cast matches the store's existing pattern (`loadUser` calls `api.GET('/auth/me' as never)`, `updateCurrentUser` calls `api.PUT('/auth/me' as never, …)`) to keep the test-injectable `AuthenticatedClientLike` from over-narrowing the generic openapi-fetch signature. Keep it consistent with those two call sites.

- [ ] **Run the tests — expect PASS.**

  ```
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/auth/auth-store.test.ts"
  ```

  Expected: all tests pass (`Tests: 11 passed` — 8 prior + 3 new), and the prior `clears the query cache on sign-out` test still passes (the default-client branch in that test calls the real `api.POST('/auth/logout')`, which fails the fetch under the jest env, is swallowed, and still reaches `queryClient.clear()`).

- [ ] **Guard the prior cache-clear test.** Re-read `auth-store.test.ts:75-82` (`clears the query cache on sign-out`): it builds `createAuthStore()` with the **default** client and asserts `queryClient.clear()` runs exactly once. With the new code the default client now performs a real `POST /auth/logout` first. Under jest that fetch rejects (no server) and is caught, so teardown still runs and the assertion holds — but to keep it hermetic and silence the network attempt, inject a fake client so it never touches `fetch`:

  ```ts
  test('clears the query cache on sign-out', async () => {
    const clearSpy = jest.spyOn(queryClient, 'clear');
    clearSpy.mockClear(); // robust against any prior signOut in the suite
    const client = {
      GET: jest.fn(async () => ({ data: ME, error: undefined })),
      POST: jest.fn(async () => ({ data: { logoutUrl: 'https://workos.test/logout' }, error: undefined })),
    };
    const store = createAuthStore(client as unknown as AuthenticatedClientLike);
    await store.getState().signOut();
    expect(clearSpy).toHaveBeenCalledTimes(1);
    clearSpy.mockRestore();
  });
  ```

  Re-run the file; expect green.

  ```
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/auth/auth-store.test.ts"
  ```

- [ ] **Confirm the Profile screen still drives sign-out.** No edit needed — `app/(tabs)/profile.tsx:462-467` already renders the `Sign out` `ZButton` calling `void authStore.getState().signOut()`, and `__tests__/profile-screen.test.tsx:172-181` (`signs out via the auth store`) stubs `signOut`, so it is unaffected. Run it to prove no regression:

  ```
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/__tests__/profile-screen.test.tsx"
  ```

  Expected: all profile-screen tests pass.

- [ ] **Commit.**

  ```
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add mobile/src/auth/auth-store.ts mobile/src/auth/auth-store.test.ts && git commit -m 'fix(mobile): end WorkOS session on sign-out via /auth/logout'"
  ```

---

## Task 2 — Permission-gate the Groups and Coaching tabs

**Files:** `mobile/src/app/(tabs)/_layout.tsx`, `mobile/src/__tests__/tabs-layout.test.tsx`

### Context you need before writing code

Current layout (`_layout.tsx:1-38`) renders all five `<Tabs.Screen>` entries unconditionally. The canonical gating permissions come from the web shell (`web/.../core/shell/shell.component.ts:85-93`):

```ts
if (item.id === 'groups')   return this.permissions.hasPermission('groups:read');
if (item.id === 'sessions') return this.permissions.hasPermission('coaching:bookings:read');
```

So: **Groups tab → `groups:read`**, **Coaching/Sessions tab → `coaching:bookings:read`**. Home, Videos, and Profile are never gated. The mobile permission-read idiom is `useAuth((s) => s.user?.permissions ?? null)` then `permissions?.includes(perm) ?? false` (used in `coaching.tsx:129-132`, `index.tsx:50-51`, `videos.tsx:70-71`, `group/[id].tsx:123-127`). expo-router only mounts `<Tabs.Screen>` elements that are actually rendered, so conditionally omitting one removes its tab button and route.

> The route files `app/(tabs)/groups.tsx` and `app/(tabs)/coaching.tsx` still exist on disk; gating only removes them from the tab bar. A user without the permission cannot navigate there from the bar. **Route-body permission hardening** — a deep link reaching a gated tab body (e.g. `/coaching` opened directly) still renders the screen — is a **tracked follow-up, not silently dropped** (see Out of scope); it is intentionally not addressed here because it needs a router/route-body guard, not nav-item hiding.

### Steps

- [ ] **Write the failing test first.** Create `mobile/src/__tests__/tabs-layout.test.tsx`. Mock expo-router's `Tabs` so we can assert which `<Tabs.Screen name=…>` entries render, and drive `useAuth` from a mutable permissions array (same approach as `__tests__/coaching-list.test.tsx:34-37` and `__tests__/videos-screen.test.tsx:14-15`).

  ```tsx
  import { render, screen } from '@testing-library/react-native';
  import { Text, View } from 'react-native';

  // Mock expo-router Tabs: render each <Tabs.Screen> as a testID-tagged node so
  // we can assert presence/absence by route name. Tabs itself is a passthrough.
  jest.mock('expo-router', () => {
    const { View: RNView } = require('react-native');
    const Tabs = ({ children }: { children: React.ReactNode }) => <RNView>{children}</RNView>;
    Tabs.Screen = ({ name }: { name: string }) => <RNView testID={`tab-${name}`} />;
    return { Tabs };
  });

  // Drive permissions through useAuth, matching the screen-test idiom. Spread the
  // real module first (like coaching-list.test.tsx / videos-screen.test.tsx) so the
  // mock stays robust if _layout imports anything else from auth-store later.
  let mockPermissions: string[] | null = [];
  jest.mock('../auth/auth-store', () => ({
    ...jest.requireActual('../auth/auth-store'),
    useAuth: (selector: (s: { user: { permissions: string[] } | null }) => unknown) =>
      selector({ user: mockPermissions !== null ? { permissions: mockPermissions } : null }),
  }));

  import { initI18n } from '../i18n';
  import TabsLayout from '../app/(tabs)/_layout';

  beforeAll(() => initI18n('en'));
  beforeEach(() => {
    mockPermissions = [];
  });

  test('always renders Home, Videos, and Profile tabs', async () => {
    mockPermissions = [];
    await render(<TabsLayout />);
    expect(screen.getByTestId('tab-index')).toBeOnTheScreen();
    expect(screen.getByTestId('tab-videos')).toBeOnTheScreen();
    expect(screen.getByTestId('tab-profile')).toBeOnTheScreen();
  });

  test('hides Groups and Coaching tabs without the permissions', async () => {
    mockPermissions = ['assets:read'];
    await render(<TabsLayout />);
    expect(screen.queryByTestId('tab-groups')).toBeNull();
    expect(screen.queryByTestId('tab-coaching')).toBeNull();
  });

  test('shows the Groups tab with groups:read', async () => {
    mockPermissions = ['groups:read'];
    await render(<TabsLayout />);
    expect(screen.getByTestId('tab-groups')).toBeOnTheScreen();
    expect(screen.queryByTestId('tab-coaching')).toBeNull();
  });

  test('shows the Coaching tab with coaching:bookings:read', async () => {
    mockPermissions = ['coaching:bookings:read'];
    await render(<TabsLayout />);
    expect(screen.getByTestId('tab-coaching')).toBeOnTheScreen();
    expect(screen.queryByTestId('tab-groups')).toBeNull();
  });

  test('shows both gated tabs when both permissions are present', async () => {
    mockPermissions = ['groups:read', 'coaching:bookings:read'];
    await render(<TabsLayout />);
    expect(screen.getByTestId('tab-groups')).toBeOnTheScreen();
    expect(screen.getByTestId('tab-coaching')).toBeOnTheScreen();
  });
  ```

  > The unused `Text`/`View` import line keeps parity with the screen tests' import header; drop it if your linter flags it — the mock's `require('react-native')` is what the factory uses.

- [ ] **Run the test — expect FAIL.** The current `_layout.tsx` renders the gated tabs unconditionally, so `hides Groups and Coaching tabs without the permissions` fails.

  ```
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/__tests__/tabs-layout.test.tsx"
  ```

  Expected:
  ```
  ● hides Groups and Coaching tabs without the permissions
    expect(received).toBeNull()
    Received element: <View testID="tab-groups" />
  ```

- [ ] **Minimal implementation.** Replace the body of `mobile/src/app/(tabs)/_layout.tsx` with the gated version:

  ```tsx
  import { Tabs } from 'expo-router';
  import { CalendarClock, Home, UserRound, Users, Video } from 'lucide-react-native';
  import { useTranslation } from 'react-i18next';
  import { useAuth } from '../../auth/auth-store';
  import { colors } from '../../theme/colors';

  export default function TabsLayout() {
    const { t } = useTranslation();
    // Mirror the web shell nav gating (shell.component.ts): Groups → groups:read,
    // Sessions/Coaching → coaching:bookings:read. expo-router only mounts the
    // <Tabs.Screen> entries we render, so omitting one hides its tab + route.
    const permissions = useAuth((s) => s.user?.permissions ?? null);
    const has = (perm: string) => permissions !== null && permissions.includes(perm);
    const canSeeGroups = has('groups:read');
    const canSeeCoaching = has('coaching:bookings:read');

    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: t('common.nav.home'), tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="videos"
          options={{ title: t('common.nav.videos'), tabBarIcon: ({ color, size }) => <Video color={color} size={size} /> }}
        />
        {canSeeCoaching ? (
          <Tabs.Screen
            name="coaching"
            options={{ title: t('common.nav.sessions'), tabBarIcon: ({ color, size }) => <CalendarClock color={color} size={size} /> }}
          />
        ) : null}
        {canSeeGroups ? (
          <Tabs.Screen
            name="groups"
            options={{ title: t('common.nav.groups'), tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }}
          />
        ) : null}
        <Tabs.Screen
          name="profile"
          options={{ title: t('preferences.title'), tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} /> }}
        />
      </Tabs>
    );
  }
  ```

- [ ] **Run the test — expect PASS.**

  ```
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/__tests__/tabs-layout.test.tsx"
  ```

  Expected: all five tabs-layout tests pass.

- [ ] **Commit.**

  ```
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add 'mobile/src/app/(tabs)/_layout.tsx' mobile/src/__tests__/tabs-layout.test.tsx && git commit -m 'fix(mobile): permission-gate Groups and Coaching tabs to match web shell'"
  ```

---

## Task 3 — (Optional) `returnTo` deep-link on the auth callback

**Files:** `mobile/src/app/auth/callback.tsx`

This is the task brief's optional item. Implement it **only** if the parallel session has confirmed it is wanted; otherwise leave `callback.tsx` untouched and record it under Out of scope. Today the callback always redirects to `/` after sign-in (`callback.tsx:35`). A `returnTo` would let a deep link (e.g. an invite URL that triggered login) resume the intended route.

> ⚠️ This is **not** required for WP0's two parity fixes and is the lowest-priority item. Do it last, behind its own test, and do not block the package on it. If implemented:

- [ ] **Write the failing test first** in `mobile/src/__tests__/auth-callback.test.tsx`: mock `expo-router` (`useLocalSearchParams` returning `{ returnTo: '/group/g1' }`, a spy `Redirect`) and `useAuth` returning `status: 'signedIn'`; assert the rendered `Redirect` targets `/group/g1`, and with no `returnTo` it targets `/`. (Mirror the mock style in Task 2 and `coaching-list.test.tsx`.)
- [ ] **Run — expect FAIL** (`callback.tsx` hardcodes `href="/"`).
  ```
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/__tests__/auth-callback.test.tsx"
  ```
- [ ] **Implement:** read `returnTo` from `useLocalSearchParams<{ code?: string; returnTo?: string }>()`, validate it is an in-app path (must start with `/` and not `//` — reject absolute/external URLs to avoid open-redirect), and use it as the `Redirect` href when `status === 'signedIn'`, defaulting to `/`:
  ```tsx
  const { code, returnTo } = useLocalSearchParams<{ code?: string; returnTo?: string }>();
  const safeReturnTo =
    typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//')
      ? returnTo
      : '/';
  // …
  if (status === 'signedIn') return <Redirect href={safeReturnTo} />;
  ```
- [ ] **Run — expect PASS**, then commit:
  ```
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add 'mobile/src/app/auth/callback.tsx' mobile/src/__tests__/auth-callback.test.tsx && git commit -m 'feat(mobile): honor returnTo deep-link after auth callback'"
  ```

---

## UI Parity & Component Reuse

Minimal-UI package: **no new components, no new screens, no new primitives, no new i18n keys.** Every visible element is an existing control left in place; the changes are behavioral (network call on sign-out) and structural (conditional tab registration).

| Screen / element | Web parity reference | Mobile treatment | Existing primitive / component reused (path) | New? |
| --- | --- | --- | --- | --- |
| Profile "Sign out" control | `core/shell/shell.component.ts` logout action | **Unchanged** `ZButton` (`variant="secondary"`, `LogOut` icon) already calls `signOut()`; only the store behind it changes | `ZButton` — `mobile/src/components/ui/z-button.tsx` (rendered at `app/(tabs)/profile.tsx:462-467`) | No |
| Sign-out feedback | Web opens `logoutUrl` in the browser | Open `logoutUrl` via `WebBrowser.openBrowserAsync` (system browser tab); no in-app UI. **No `ZConfirmDialog`** — sign-out is non-destructive of user data and the web has no confirm step, so adding one would be drift | `expo-web-browser` (already used in `app/login.tsx`) | No |
| Tab bar — Groups item | `shell.component.ts:87-88` (`groups:read`) | Conditionally render `<Tabs.Screen name="groups">` | expo-router `Tabs.Screen` (config only) | No |
| Tab bar — Coaching item | `shell.component.ts:91-92` (`coaching:bookings:read`) | Conditionally render `<Tabs.Screen name="coaching">` | expo-router `Tabs.Screen` (config only) | No |
| Tab bar — Home / Videos / Profile | always-visible web nav items | Unchanged, always rendered | expo-router `Tabs.Screen` (config only) | No |

**Header treatment:** Not applicable — this package adds no screen. The tab shell is navigation chrome, not a screen body; the only edited screen (`profile.tsx`) is a form screen whose header card + `ZTabs` is unchanged. No `ZScreen`/`ZPageHeader`/FAB decisions are introduced.

**i18n:** No new keys. The sign-out label already uses `common.actions.signOut`; the gated tab titles already use `common.nav.groups` and `common.nav.sessions`. No `sync:i18n` run (destructive — avoided per the i18n-drift note).

---

## CONSTRAINTS (carry into every commit)

- **Single PR #15**, branch `feat/mobile-token-auth`. Local commits per task (Task 1, Task 2, optional Task 3); **no push** — the user finalizes the PR.
- **Shared working tree** with a parallel screen-touching session. `auth-store.ts` and `_layout.tsx` are **not** in the Groups create/invite slice's file set (that slice's Phase B touches `(tabs)/{videos,groups,coaching,index}.tsx`, `group/[id].tsx`, `group/create.tsx`). **`_layout.tsx` is a potential overlap** — confirm the parallel session is not mid-edit on `_layout.tsx` before starting Task 2; if it is, gate Task 2 until they signal done. Task 1 (`auth-store.ts` + its test) is collision-free — run it now.
- **No shared-DB migration** (no Go/schema change in this package at all).
- **WSL tooling:** all `pnpm`/`git` via `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && …"`.
- **No codegen / lint / push in the plan-authoring step.** When executing, run `make mobile:lint` + `make mobile:typecheck` before the final commit of the package, and attach an **emulator screenshot** of the tab bar (a `groups:read`-only user vs. a full-permission user) and a screen recording / note of the sign-out opening the logout URL to the PR body (mobile UI changes require screenshots per `mobile/AGENTS.md`).

## Verification

- **Task 1:** `pnpm --dir mobile jest src/auth/auth-store.test.ts` green (11 tests); `pnpm --dir mobile jest src/__tests__/profile-screen.test.tsx` green (no sign-out regression). Manual: on the emulator, tap **Sign out** → a browser tab opens the WorkOS logout URL and the app lands on the login screen; with the device offline, **Sign out** still returns to login (local teardown).
- **Task 2:** `pnpm --dir mobile jest src/__tests__/tabs-layout.test.tsx` green (5 tests). Manual: a student token without `groups:read`/`coaching:bookings:read` shows only Home / Videos / Profile; an expert token shows all five.
- **Package gates:** `make mobile:lint`, `make mobile:typecheck`, `make mobile:test` all green before the final commit.

## Out of scope / follow-ups

- **Route-body permission hardening (tracked follow-up, not dropped):** gating only the tab bar leaves `app/(tabs)/groups.tsx` / `coaching.tsx` reachable via a raw deep link — a deep link reaching a gated tab body still renders it. A `permission`-guard on the route bodies (redirect to `/` when the perm is absent) mirrors the web `permissionGuard` and is the planned follow-up, but the web equivalent is a router guard, not nav-item hiding, so it is deliberately deferred to its own task rather than bolted onto this minimal-UI package — track separately, do not silently drop.
- **`returnTo` deep-link (Task 3)** is optional and may be deferred entirely if the parallel session does not need it.
- No backend, no contract, no new i18n, no new component — by design.

---

## SELF-REVIEW

**Spec coverage (task brief WP0):**
- (1) Sign-out calls the existing `logout` op **before** clearing tokens, opening the returned `logoutUrl`, and **still clears locally on failure** → Task 1 (`auth-store.ts:signOut` rewrite; three new tests incl. the error and throw paths assert local teardown survives). The brief's line refs (`profile.tsx ~:462`, `auth-store.ts ~:85`) both verified: `profile.tsx:462-467` already wires the button to `signOut()` (no edit), `auth-store.ts:86-90` is the `signOut` body being rewritten. ✓
- (2) Tab shell permission-gating: `_layout.tsx:16-35` renders all five tabs; Task 2 hides **Groups** (`groups:read`) and **Coaching** (`coaching:bookings:read`), matching the canonical web shell (`shell.component.ts:85-93`). "grep how perms are read on mobile" resolved → `useAuth((s) => s.user?.permissions ?? null)` idiom (cited from `coaching.tsx`/`index.tsx`/`videos.tsx`). ✓
- Optional `returnTo` deep-link (`callback.tsx ~:35`) → Task 3, flagged optional with an open-redirect guard. ✓
- UI-reuse mandate (minimal UI, no new components, no confirm unless introduced) → honored: no new components; `ZConfirmDialog` explicitly **not** added (justified — non-destructive, no web confirm). ✓

**Placeholder scan:** No "TBD"/"add validation"/"handle edge cases"/"similar to Task N"/"tests for the above". Every test body and implementation body is shown as real code. The optional Task 3 test is described rather than fully written **because it is explicitly optional and gated**; its implementation snippet is concrete (the `safeReturnTo` guard). ✓

**Type / name consistency:**
- `AuthenticatedClientLike` widened to `Pick<…, 'GET' | 'PUT' | 'POST'>` — every injected test client now supplies `POST`; the `logoutClient`/`throwing` fakes and the patched `clears the query cache` fake all provide `GET` + `POST`. ✓
- `POST('/auth/logout')` matches the generated path (`schema.d.ts:303` `"/auth/logout"` → `:313` `post: operations["logout"]`); the response shape `{ logoutUrl: string }` matches `LogoutResponse` (`schema.d.ts:528-530`). The `as never` cast is consistent with the store's existing `GET('/auth/me' as never)` / `PUT('/auth/me' as never, …)`. ✓
- `WebBrowser.openBrowserAsync` is the real `expo-web-browser` API (dep present `~56.0.5`; `WebBrowser` already imported in `app/login.tsx`); mocked in the test with `openBrowserAsync`. ✓
- Permission strings `groups:read` and `coaching:bookings:read` are the exact web-shell values and exist in mobile usage (`profile.tsx`, route specs). Tab `name` props (`index`/`videos`/`coaching`/`groups`/`profile`) match the existing `_layout.tsx` and the route filenames. ✓
- i18n keys (`common.actions.signOut`, `common.nav.groups`, `common.nav.sessions`, `common.nav.home`, `common.nav.videos`, `preferences.title`) are all pre-existing in `_layout.tsx`/`profile.tsx`; no new keys introduced. ✓
- Test files live outside `src/app/` (`src/__tests__/tabs-layout.test.tsx`) or co-located with non-route modules (`src/auth/auth-store.test.ts`) per `mobile/AGENTS.md` (never under `src/app/`). ✓
