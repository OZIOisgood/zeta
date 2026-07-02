# Mobile Plan 4: Videos — List + Playback — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Videos tab shows the user's visible assets (server-side visibility: students see their own uploads, experts see group submissions) with thumbnails and status; tapping an asset opens a detail screen that plays its video(s) via Mux HLS in `expo-video`.

**Architecture:** The OpenAPI contract grows by `GET /assets` and `GET /assets/{id}` (schemas mirror the Go `AssetItem`/`VideoItem`/`GroupInfo` JSON tags exactly). TanStack Query enters the app as the server-state layer: a `QueryClientProvider` in the root layout, query hooks in `src/api/queries/assets.ts` using the shared authenticated client (exported from the auth-store module to avoid an import cycle). The list screen uses skeleton placeholders (project rule: no loading text), empty/error states, and pull-to-refresh. The detail screen `src/app/asset/[id].tsx` lives inside the signed-in `Stack.Protected` block and renders `expo-video` with `https://stream.mux.com/{playback_id}.m3u8`.

**Tech Stack:** @tanstack/react-query v5, expo-video, openapi-typescript regeneration, existing NativeWind tokens + ZButton, jest 29 + RNTL 14 (async `render`).

**Parent spec:** `.agents/plans/20260611225227_mobile_app_react_native_expo_design.md`
**Predecessors:** Plans 1–3 on branch `feat/mobile-token-auth` (PR #15). Plan 4 continues on the SAME branch.

**Product terms:** UI copy says **video** (and "parts"/"clips" for child media); API/types keep `asset`/`videos`. Do not rename API fields.

**Conventions for every task:**
- Shell via `wsl.exe -d ubuntu --cd /home/heinrich/dev/projects/zeta -- bash -c "..."`; pnpm fallbacks `bash -ic`/`corepack pnpm`; installs/exports timeout 600000. File edits via `\\wsl.localhost\ubuntu\home\heinrich\dev\projects\zeta`.
- RNTL 14: `await render(...)`. Per task: `cd mobile && pnpm run test && pnpm exec tsc --noEmit && pnpm run lint` green before commit.
- Conventional Commits, no `Co-Authored-By`, never `git add -A`.

---

## Backend source of truth (verified)

`internal/assets/handler.go` (routes mounted under `/assets`, behind RequireAuth):
- `GET /assets` → `[]AssetItem` — AssetItem: `id`, `title`, `description`, `owner_id`, `status` (waiting_upload|pending|completed), `thumbnail` (omitempty), `playback_id` (omitempty), `review_count` (int64), `videos` (omitempty), `group` (omitempty). List responses do NOT include `videos`/`group`.
- `GET /assets/{id}` → `AssetItem` incl. `videos: []VideoItem` (`id`, `playback_id`, `status`, `review_count`) and `group: GroupInfo` (`id`, `name`, `avatar` omitempty). 400 invalid UUID, 404 not visible.
- Thumbnails: `https://image.mux.com/{playback_id}/thumbnail.png`. Streams: `https://stream.mux.com/{playback_id}.m3u8` (public playback IDs).

## File Structure (end state)

```
docs/openapi.yaml                       + /assets, /assets/{id}, Asset/AssetVideo/AssetGroup schemas
mobile/src/api/schema.d.ts              regenerated
mobile/src/api/queries/assets.ts        useAssetsQuery, useAssetQuery
mobile/src/api/queries/assets.test.tsx
mobile/src/api/query-client.ts          shared QueryClient factory
mobile/src/auth/auth-store.ts           + export the api singleton
mobile/src/components/ui/z-skeleton.tsx + test
mobile/src/components/asset-card.tsx    list card (thumbnail, title, status, review count) + test
mobile/src/app/(tabs)/index.tsx         real Videos list (skeletons/empty/error/refresh)
mobile/src/app/asset/[id].tsx           detail + expo-video player
mobile/src/__tests__/videos-list.test.tsx
mobile/src/__tests__/asset-detail.test.tsx
mobile/src/app/_layout.tsx              + QueryClientProvider, + asset/[id] in the Protected block
```

---

### Task 1: Extend the OpenAPI contract + regenerate the client

**Files:**
- Modify: `docs/openapi.yaml`, `mobile/src/api/schema.d.ts` (regenerated)

- [ ] **Step 1: Add to `docs/openapi.yaml`** — under `paths:` (these inherit the global `bearerAuth`; no `security: []`):

```yaml
  /assets:
    get:
      tags: [assets]
      summary: List assets visible to the current user
      operationId: listAssets
      responses:
        "200":
          description: Visible assets (students see their own, experts their groups')
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Asset"
        "401":
          description: Not authenticated
  /assets/{id}:
    get:
      tags: [assets]
      summary: Get a single visible asset including its video parts
      operationId: getAsset
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: The asset with its videos and group
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Asset"
        "400":
          description: Invalid asset id
        "401":
          description: Not authenticated
        "404":
          description: Asset not found or not visible
```

Add `- name: assets` to the top-level `tags:` list. Under `components.schemas` add (field names mirror `internal/assets/handler.go:104-128` exactly; omitempty ⇒ optional):

```yaml
    AssetGroup:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        avatar:
          type: string
          description: Base64-encoded group avatar; omitted when unset
      required: [id, name]
    AssetVideo:
      type: object
      properties:
        id:
          type: string
        playback_id:
          type: string
          description: Mux public playback ID; empty while the upload is processing
        status:
          type: string
        review_count:
          type: integer
          format: int64
      required: [id, playback_id, status, review_count]
    Asset:
      type: object
      description: >
        Parent reviewable submission (UI copy calls it a video). List responses
        omit videos and group; the detail response includes them.
      properties:
        id:
          type: string
        title:
          type: string
        description:
          type: string
        owner_id:
          type: string
        status:
          type: string
          enum: [waiting_upload, pending, completed]
        thumbnail:
          type: string
          description: Mux thumbnail URL; omitted while no playback ID exists
        playback_id:
          type: string
        review_count:
          type: integer
          format: int64
        videos:
          type: array
          items:
            $ref: "#/components/schemas/AssetVideo"
        group:
          $ref: "#/components/schemas/AssetGroup"
      required: [id, title, description, owner_id, status, review_count]
```

NOTE: `review_count` is absent from the GetAsset response struct population (the handler fills `Videos` instead) but the field is always serialized (no omitempty) — it stays `required`.

- [ ] **Step 2: Lint + regenerate**

```bash
bash -ic "make api:openapi:lint"
cd mobile && pnpm run generate:api && git diff --stat -- src/api/schema.d.ts
```
Lint: 0 errors. The schema diff must show the new paths/schemas.

- [ ] **Step 3: Verify mobile still green, commit**

```bash
cd mobile && pnpm run test && pnpm exec tsc --noEmit
git add docs/openapi.yaml mobile/src/api/schema.d.ts
git commit -m "feat(api): add asset endpoints to the OpenAPI contract"
```

---

### Task 2: Shared api singleton + TanStack Query setup + asset query hooks

**Files:**
- Modify: `mobile/src/auth/auth-store.ts` (export the api client), `mobile/src/app/_layout.tsx` (QueryClientProvider)
- Create: `mobile/src/api/query-client.ts`, `mobile/src/api/queries/assets.ts`, `mobile/src/api/queries/assets.test.tsx`

- [ ] **Step 1: Install**

```bash
cd mobile && pnpm add @tanstack/react-query
```

- [ ] **Step 2: Export the api singleton from the auth-store module.** In `mobile/src/auth/auth-store.ts`, the client currently lives inside `createAuthStore`. Restructure WITHOUT changing behavior or tests: keep `createAuthStore(client?)` as is, but build the default client at module level and pass it:

```ts
/**
 * Shared authenticated client. Lives in this module (not api/) because its
 * onSignOut must flip the auth store — colocating avoids an import cycle.
 */
export const api = createAuthenticatedClient({
  onSignOut: () => {
    authStore.setState({ status: 'signedOut', user: null });
  },
});

export const authStore = createAuthStore(api);
```

CAREFUL: `onSignOut` references `authStore` before its initialization — that's fine because the callback only runs after module init (lazy). But TS/ESLint may flag use-before-assign on `const`; if so, declare with a `let`-free pattern: define `onSignOut` to call a function that reads the exported binding (function declarations hoist):

```ts
function handleSignOut() {
  authStore.setState({ status: 'signedOut', user: null });
}
export const api = createAuthenticatedClient({ onSignOut: handleSignOut });
export const authStore = createAuthStore(api);
```

Inside `createAuthStore`, the `client ?? createAuthenticatedClient(...)` fallback becomes unnecessary for the singleton path but KEEP the optional parameter for tests; the internal fallback's `onSignOut` used `set` — keep it as the fallback. Run the existing auth-store tests — they must stay green unchanged.

- [ ] **Step 3: Query client factory** `mobile/src/api/query-client.ts`:

```ts
import { QueryClient } from '@tanstack/react-query';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
    },
  });
}
```

- [ ] **Step 4: Query hooks** `mobile/src/api/queries/assets.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import type { components } from '../schema';
import { api } from '../../auth/auth-store';

export type Asset = components['schemas']['Asset'];

type Fetcher = Pick<typeof api, 'GET'>;

export function useAssetsQuery(client: Fetcher = api) {
  return useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const { data, error } = await client.GET('/assets');
      if (error || !data) throw new Error('Failed to load videos');
      return data;
    },
  });
}

export function useAssetQuery(id: string, client: Fetcher = api) {
  return useQuery({
    queryKey: ['assets', id],
    queryFn: async () => {
      const { data, error } = await client.GET('/assets/{id}', {
        params: { path: { id } },
      });
      if (error || !data) throw new Error('Failed to load video');
      return data;
    },
  });
}
```

- [ ] **Step 5: Failing hook tests** `mobile/src/api/queries/assets.test.tsx` (renderHook with a provider wrapper; retry off in tests):

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

import { useAssetQuery, useAssetsQuery } from './assets';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const ASSET = {
  id: 'a1', title: 'Kata 1', description: '', owner_id: 'u1',
  status: 'pending' as const, review_count: 2,
};

test('useAssetsQuery returns the asset list', async () => {
  const client = { GET: jest.fn(async () => ({ data: [ASSET], error: undefined })) };
  const { result } = renderHook(() => useAssetsQuery(client as never), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([ASSET]);
});

test('useAssetsQuery surfaces errors', async () => {
  const client = { GET: jest.fn(async () => ({ data: undefined, error: { message: 'boom' } })) };
  const { result } = renderHook(() => useAssetsQuery(client as never), { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true));
});

test('useAssetQuery requests the asset by id', async () => {
  const GET = jest.fn(async () => ({ data: { ...ASSET, videos: [] }, error: undefined }));
  const { result } = renderHook(() => useAssetQuery('a1', { GET } as never), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(GET).toHaveBeenCalledWith('/assets/{id}', { params: { path: { id: 'a1' } } });
});
```

Run → FAIL (module not found). Then implement Steps 3-4, run → green. (If `renderHook` needs async semantics under RNTL 14, follow its docs; `waitFor` handles settling.)

- [ ] **Step 6: Provider in the root layout** — in `mobile/src/app/_layout.tsx` wrap the returned `<Stack>` (NOT the loading spinner branch — wrap the whole return so both branches share it; simplest: wrap at the top):

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '../api/query-client';

const queryClient = createQueryClient();
```

and in the component return `<QueryClientProvider client={queryClient}>{...existing tree...}</QueryClientProvider>` for BOTH branches (loading and Stack) — easiest by wrapping once around the whole conditional render.

- [ ] **Step 7: Verify + commit**

```bash
cd mobile && pnpm run test && pnpm exec tsc --noEmit && pnpm run lint
git add mobile/src/ mobile/package.json mobile/pnpm-lock.yaml
git commit -m "feat(mobile): add TanStack Query with asset hooks"
```

---

### Task 3: ZSkeleton + AssetCard components

**Files:**
- Create: `mobile/src/components/ui/z-skeleton.tsx`, `mobile/src/components/ui/z-skeleton.test.tsx`, `mobile/src/components/asset-card.tsx`, `mobile/src/components/asset-card.test.tsx`

- [ ] **Step 1: Failing tests**

`z-skeleton.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import { ZSkeleton } from './z-skeleton';

test('renders an accessible placeholder', async () => {
  await render(<ZSkeleton testID="sk" className="h-4 w-24" />);
  expect(screen.getByTestId('sk')).toBeOnTheScreen();
});
```

`asset-card.test.tsx`:

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';
import { AssetCard } from './asset-card';

const ASSET = {
  id: 'a1', title: 'Kata 1', description: 'desc', owner_id: 'u1',
  status: 'pending' as const, review_count: 3,
  thumbnail: 'https://image.mux.com/pb1/thumbnail.png',
};

test('shows title, review count and fires onPress', async () => {
  const user = userEvent.setup();
  const onPress = jest.fn();
  await render(<AssetCard asset={ASSET} onPress={onPress} />);
  await user.press(screen.getByRole('button', { name: 'Kata 1' }));
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Kata 1')).toBeOnTheScreen();
  expect(screen.getByText('3')).toBeOnTheScreen();
});

test('completed assets show the reviewed badge', async () => {
  await render(<AssetCard asset={{ ...ASSET, status: 'completed' }} onPress={jest.fn()} />);
  expect(screen.getByTestId('asset-status-completed')).toBeOnTheScreen();
});
```

Run → FAIL.

- [ ] **Step 2: Implement**

`z-skeleton.tsx` (pulse via simple opacity animation is optional; a static muted block satisfies the skeleton rule — keep it minimal and animation-free for now):

```tsx
import { View } from 'react-native';

export function ZSkeleton({ className = '', testID }: { className?: string; testID?: string }) {
  return <View testID={testID} className={`rounded-md bg-z-surface-muted ${className}`} />;
}
```

`asset-card.tsx`:

```tsx
import { Image, Pressable, Text, View } from 'react-native';
import { MessageSquare, Video as VideoIcon } from 'lucide-react-native';
import type { Asset } from '../api/queries/assets';

const STATUS_STYLES: Record<Asset['status'], { label: string; className: string }> = {
  waiting_upload: { label: 'Uploading', className: 'bg-z-surface-muted text-z-muted' },
  pending: { label: 'In review', className: 'bg-z-primary-soft text-z-primary-strong' },
  completed: { label: 'Reviewed', className: 'bg-z-success/15 text-z-success' },
};

export function AssetCard({ asset, onPress }: { asset: Asset; onPress: () => void }) {
  const status = STATUS_STYLES[asset.status];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={asset.title}
      onPress={onPress}
      className="mb-3 flex-row items-center gap-3 rounded-lg border border-z-border bg-z-surface p-3 active:bg-z-surface-warm"
    >
      <View className="h-16 w-24 items-center justify-center overflow-hidden rounded-md bg-z-surface-muted">
        {asset.thumbnail ? (
          <Image source={{ uri: asset.thumbnail }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <VideoIcon color="#735f4d" size={24} />
        )}
      </View>
      <View className="flex-1 gap-1">
        <Text numberOfLines={1} className="text-base font-semibold text-z-text">
          {asset.title}
        </Text>
        <View className="flex-row items-center gap-2">
          <Text
            testID={`asset-status-${asset.status}`}
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
          >
            {status.label}
          </Text>
          <View className="flex-row items-center gap-1">
            <MessageSquare color="#735f4d" size={14} />
            <Text className="text-xs text-z-muted">{asset.review_count}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
```

(If `bg-z-success/15` opacity syntax doesn't compile with the CSS-var color setup, use `bg-z-surface-muted` for the completed badge background instead and note it. Status labels stay English literals — i18n lookup happens in Task 5 if dashboard keys exist.)

- [ ] **Step 3: Verify + commit**

```bash
cd mobile && pnpm run test && pnpm exec tsc --noEmit && pnpm run lint
git add mobile/src/components/
git commit -m "feat(mobile): add skeleton and asset card components"
```

---

### Task 4: Videos list screen + asset detail with player

**Files:**
- Modify: `mobile/src/app/(tabs)/index.tsx`, `mobile/src/app/_layout.tsx` (register `asset/[id]` inside the signed-in guard)
- Create: `mobile/src/app/asset/[id].tsx`, `mobile/src/__tests__/videos-list.test.tsx`, `mobile/src/__tests__/asset-detail.test.tsx`
- Install: expo-video

- [ ] **Step 1: Install**

```bash
cd mobile && pnpm exec expo install expo-video
```
(`expo-video` may add a plugin entry to app.json — keep it.)

- [ ] **Step 2: Failing tests** (in `src/__tests__/` — NEVER inside `src/app/`):

`videos-list.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

const mockUseAssetsQuery = jest.fn();
jest.mock('../api/queries/assets', () => ({
  ...jest.requireActual('../api/queries/assets'),
  useAssetsQuery: () => mockUseAssetsQuery(),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import VideosScreen from '../app/(tabs)/index';

function Providers({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const ASSET = {
  id: 'a1', title: 'Kata 1', description: '', owner_id: 'u1',
  status: 'pending' as const, review_count: 0,
};

test('loading state renders skeletons, not text', async () => {
  mockUseAssetsQuery.mockReturnValue({ isPending: true, isError: false, data: undefined, refetch: jest.fn(), isRefetching: false });
  await render(<Providers><VideosScreen /></Providers>);
  expect(screen.getAllByTestId('asset-skeleton').length).toBeGreaterThan(0);
  expect(screen.queryByText(/loading/i)).toBeNull();
});

test('empty state explains there are no videos yet', async () => {
  mockUseAssetsQuery.mockReturnValue({ isPending: false, isError: false, data: [], refetch: jest.fn(), isRefetching: false });
  await render(<Providers><VideosScreen /></Providers>);
  expect(screen.getByTestId('videos-empty')).toBeOnTheScreen();
});

test('error state offers retry', async () => {
  const refetch = jest.fn();
  mockUseAssetsQuery.mockReturnValue({ isPending: false, isError: true, data: undefined, refetch, isRefetching: false });
  await render(<Providers><VideosScreen /></Providers>);
  expect(screen.getByRole('button', { name: 'Try again' })).toBeOnTheScreen();
});

test('data state lists assets and navigates on tap', async () => {
  mockUseAssetsQuery.mockReturnValue({ isPending: false, isError: false, data: [ASSET], refetch: jest.fn(), isRefetching: false });
  await render(<Providers><VideosScreen /></Providers>);
  expect(screen.getByText('Kata 1')).toBeOnTheScreen();
});
```

`asset-detail.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-video', () => ({
  useVideoPlayer: jest.fn(() => ({})),
  VideoView: () => null,
}));

const mockUseAssetQuery = jest.fn();
jest.mock('../api/queries/assets', () => ({
  ...jest.requireActual('../api/queries/assets'),
  useAssetQuery: (id: string) => mockUseAssetQuery(id),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'a1' }),
  useRouter: () => ({ back: jest.fn() }),
}));

import AssetDetailScreen from '../app/asset/[id]';

function Providers({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const DETAIL = {
  id: 'a1', title: 'Kata 1', description: 'Front stance drill', owner_id: 'u1',
  status: 'pending' as const, review_count: 0, playback_id: 'pb1',
  videos: [
    { id: 'v1', playback_id: 'pb1', status: 'ready', review_count: 2 },
    { id: 'v2', playback_id: '', status: 'preparing', review_count: 0 },
  ],
};

test('shows title, description and the player for the playable part', async () => {
  mockUseAssetQuery.mockReturnValue({ isPending: false, isError: false, data: DETAIL });
  await render(<Providers><AssetDetailScreen /></Providers>);
  expect(screen.getByText('Kata 1')).toBeOnTheScreen();
  expect(screen.getByText('Front stance drill')).toBeOnTheScreen();
});

test('loading state renders a skeleton', async () => {
  mockUseAssetQuery.mockReturnValue({ isPending: true, isError: false, data: undefined });
  await render(<Providers><AssetDetailScreen /></Providers>);
  expect(screen.getByTestId('asset-detail-skeleton')).toBeOnTheScreen();
});
```

Run → FAIL.

- [ ] **Step 3: Videos list** `mobile/src/app/(tabs)/index.tsx`:

```tsx
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CloudOff, Video as VideoIcon } from 'lucide-react-native';
import { useAssetsQuery } from '../../api/queries/assets';
import { AssetCard } from '../../components/asset-card';
import { ZButton } from '../../components/ui/z-button';
import { ZSkeleton } from '../../components/ui/z-skeleton';

function ListSkeleton() {
  return (
    <View className="gap-3 p-4">
      {[0, 1, 2, 3].map((i) => (
        <View key={i} testID="asset-skeleton" className="flex-row gap-3 rounded-lg border border-z-border bg-z-surface p-3">
          <ZSkeleton className="h-16 w-24" />
          <View className="flex-1 justify-center gap-2">
            <ZSkeleton className="h-4 w-3/5" />
            <ZSkeleton className="h-3 w-2/5" />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function VideosScreen() {
  const router = useRouter();
  const { data, isPending, isError, refetch, isRefetching } = useAssetsQuery();

  if (isPending) return <View className="flex-1 bg-z-bg"><ListSkeleton /></View>;

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-z-bg px-8">
        <CloudOff color="#735f4d" size={32} />
        <Text className="text-center text-z-muted">Your videos could not be loaded.</Text>
        <ZButton label="Try again" variant="secondary" onPress={() => void refetch()} />
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View testID="videos-empty" className="flex-1 items-center justify-center gap-3 bg-z-bg px-8">
        <VideoIcon color="#735f4d" size={32} />
        <Text className="text-lg font-semibold text-z-text">No videos yet</Text>
        <Text className="text-center text-z-muted">Videos you upload appear here.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-z-bg">
      <FlatList
        data={data}
        keyExtractor={(a) => a.id}
        contentContainerClassName="p-4"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
        renderItem={({ item }) => (
          <AssetCard asset={item} onPress={() => router.push(`/asset/${item.id}`)} />
        )}
      />
    </View>
  );
}
```

(If `contentContainerClassName` is unsupported by the installed NativeWind/FlatList interop, fall back to `contentContainerStyle={{ padding: 16 }}` and note it.)

- [ ] **Step 4: Asset detail** `mobile/src/app/asset/[id].tsx`:

```tsx
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ArrowLeft, Clock } from 'lucide-react-native';
import { useAssetQuery } from '../../api/queries/assets';
import { ZButton } from '../../components/ui/z-button';
import { ZSkeleton } from '../../components/ui/z-skeleton';

function streamUrl(playbackId: string) {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

export default function AssetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isPending, isError, refetch } = useAssetQuery(id ?? '');

  const playable = useMemo(
    () => (data?.videos ?? []).filter((v) => v.playback_id !== ''),
    [data],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = playable.find((v) => v.id === activeId) ?? playable[0] ?? null;

  const player = useVideoPlayer(active ? streamUrl(active.playback_id) : null);

  if (isPending) {
    return (
      <View className="flex-1 gap-4 bg-z-bg p-4">
        <ZSkeleton testID="asset-detail-skeleton" className="aspect-video w-full" />
        <ZSkeleton className="h-5 w-3/5" />
        <ZSkeleton className="h-4 w-4/5" />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-z-bg px-8">
        <Text className="text-center text-z-muted">This video could not be loaded.</Text>
        <ZButton label="Try again" variant="secondary" onPress={() => void refetch()} />
        <ZButton label="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const processingParts = (data.videos ?? []).length - playable.length;

  return (
    <ScrollView className="flex-1 bg-z-bg" contentContainerClassName="pb-8">
      <View className="aspect-video w-full items-center justify-center bg-black">
        {active ? (
          <VideoView player={player} style={{ width: '100%', height: '100%' }} allowsFullscreen />
        ) : (
          <View className="items-center gap-2">
            <Clock color="#fff8ed" size={28} />
            <Text className="text-z-bg">Processing…</Text>
          </View>
        )}
      </View>
      <View className="gap-2 p-4">
        <View className="flex-row items-center gap-2">
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()}>
            <ArrowLeft color="#26180f" size={22} />
          </Pressable>
          <Text className="flex-1 text-xl font-semibold text-z-text" numberOfLines={2}>
            {data.title}
          </Text>
        </View>
        {data.description ? <Text className="text-z-muted">{data.description}</Text> : null}
        {playable.length > 1 ? (
          <View className="flex-row flex-wrap gap-2 pt-2">
            {playable.map((v, i) => (
              <Pressable
                key={v.id}
                accessibilityRole="button"
                accessibilityLabel={`Part ${i + 1}`}
                onPress={() => setActiveId(v.id)}
                className={`rounded-full border px-3 py-1 ${
                  v.id === active?.id ? 'border-z-primary bg-z-primary-soft' : 'border-z-border bg-z-surface'
                }`}
              >
                <Text className="text-sm text-z-text">Part {i + 1}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {processingParts > 0 ? (
          <Text className="text-sm text-z-muted">
            {processingParts} more part{processingParts > 1 ? 's' : ''} still processing.
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
```

ADAPTATION: check the installed expo-video API — `useVideoPlayer(source)` accepts a string/null source in SDK 56; if null isn't accepted, pass an empty-source guard (only mount the player component when `active` exists, e.g. extract a `<PlayerSection video={active} />` child component that calls `useVideoPlayer` unconditionally with a non-null source). Hooks must not be called conditionally — restructure with a child component if needed and note it.

- [ ] **Step 5: Register the route inside the signed-in guard** — in `mobile/src/app/_layout.tsx`:

```tsx
      <Stack.Protected guard={status === 'signedIn'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="asset/[id]" />
      </Stack.Protected>
```

- [ ] **Step 6: Verify + commit**

```bash
cd mobile && pnpm run test && pnpm exec tsc --noEmit && pnpm run lint
pnpm exec expo export --platform web --output-dir /tmp/zeta-export-p4 && rm -rf /tmp/zeta-export-p4
git add mobile/
git commit -m "feat(mobile): add videos list and asset playback screen"
```
Sanity: export route list contains `/asset/[id]`, NO test routes.

---

### Task 5: i18n pass + docs + final verification

**Files:**
- Modify: list/detail screens (only where dashboard keys EXIST), `mobile/README.md`, root `README.md` (architecture diagram note)

- [ ] **Step 1: Key lookup** — inspect `mobile/src/i18n/locales/en.json` for keys covering: videos list title/empty state, status labels (uploading/in review/reviewed), retry/back. Use `grep -o '"[a-z_.]*"' ...` or read the `videos`/`common` sections. Replace English literals with `useTranslation()` + `t('the.key')` ONLY for keys that exist in ALL of en/de/fr. Keep the rest as literals and LIST them in the report (follow-up: add dashboard keys). Do NOT invent keys in the dashboard files.

- [ ] **Step 2: `mobile/README.md`** — extend the Stack section bullet list with: `- TanStack Query for server state (query hooks in src/api/queries/)` and `- expo-video for Mux HLS playback`.

- [ ] **Step 3: Root `README.md`** — in the System Architecture mermaid diagram, the Web node has `Web -->|Direct Upload| Mux` etc. Add the mobile app node if not present yet: `Mobile[Mobile App] -->|HTTP API Bearer| API` and `Mobile -->|HLS Playback| Mux`. Keep the diagram valid mermaid (verify by eye; match existing style).

- [ ] **Step 4: Full battery**

```bash
bash -ic "make mobile:lint && make mobile:typecheck && make mobile:test && make api:openapi:lint"
/usr/local/go/bin/go test ./... -count=1
```
All green.

- [ ] **Step 5: Commit**

```bash
git add mobile/ README.md
git commit -m "docs(mobile): document videos feature and wire i18n keys"
```

---

## Out of Scope (later plans)

- Upload flow (capture/pick → Mux direct upload → complete) — own plan, the upload queue is the hard part.
- Reviews/comments on the detail screen (timestamped feedback) — own plan.
- Offline caching/persistence of query data.
- Signed Mux playback URLs (current playback IDs are public, same as web).

## Verification Checklist (end of plan)

- [ ] `make mobile:lint` / `mobile:typecheck` / `mobile:test` green (≥30 tests)
- [ ] `expo export` bundles `/asset/[id]`; no test-file routes
- [ ] OpenAPI lint 0 errors; regenerated schema committed and current
- [ ] Go suite untouched and green
