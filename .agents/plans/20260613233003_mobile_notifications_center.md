# Mobile In-App Notifications Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan. Dispatch one subagent per Task, in order. Each Task is self-contained; do not batch Tasks. Steps use checkbox (`- [ ]`) syntax — tick each as you complete it. Write the FAILING test first, run it, see it fail, then write the minimal implementation, run it green, then commit. Do NOT run codegen/lint/git while authoring; those commands live inside the Tasks.

**Goal:** Give the mobile app the in-app **Notifications Center** the web already has: a bell + unread-count badge in the app shell header that opens a notifications screen. The screen lists the recipient's recent notifications (read/unread), supports **mark-one-read** and **mark-all-read**, deep-links each row to its target screen, and offers **inline accept/decline** for group-invitation notifications using the existing mobile invitation hooks. This closes the last read-surface gap between web and mobile for the events pipeline (invites, member-joined, video-reviewed, video-uploaded, coaching-booked).

**Architecture:** Shape **S** (contract-surfacing + mobile; the backend already exists). The Go `internal/notifications` package ships the handler, Hub, and Postgres LISTEN/NOTIFY listener; routes are mounted at `r.Route("/notifications", ...)` in `internal/api/server.go:210`. We surface the three JSON endpoints (`GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all`) into `docs/openapi.yaml`, regenerate the typed client, add React Query hooks, and build the shell bell + screen + a new SHARED `notification-row` domain component modelled on the web row.

**Tech Stack:** Expo/React Native (expo-router, NativeWind, i18next), `@tanstack/react-query`, `openapi-fetch` typed client generated from `docs/openapi.yaml`, jest-expo + React Native Testing Library. Backend is Go + chi (read-only here — no Go change).

**Depends on:** WP-UI0 (`20260613233000_mobile_shared_ui_foundation.md`). This plan consumes the shared primitives **`ZBackHeader`** (pushed-screen header — the notifications screen is a pushed route, NOT a tab index, so it uses `ZBackHeader`, not `ZPageHeader`), **`ZIconTile`** (the per-type icon tile via a `tone`→z-token map — no raw `bg-green-50/amber-50/rose-50`, no `text-white`), and the shared **`mobile/src/lib/datetime.ts`** `formatRelativeTime(iso, t)` (all relative-time display routes through it — this plan does NOT ship its own relative-time helper). Build WP-UI0 first; do not re-implement or rename these.

---

## Key design decisions (read before executing)

1. **No SSE `/stream` in the mobile contract — poll instead.** The web `NotificationsStore.connect()` opens a browser `EventSource` against `/notifications/stream` with `withCredentials: true` (cookie auth). Mobile auth is **Bearer-token only** (`mobile/src/api/authenticated-client.ts` injects `Authorization: Bearer …`; there is no cookie session and React Native has no `EventSource` that forwards our auth). Replicating SSE would need a custom token-aware event-source shim — out of scope for WP3. Instead the list query uses React Query `refetchInterval` (30s) so unread badge + list stay fresh, and refetches on screen focus. Live push (FCM/APNs) is the separate WP2 (push Phase B) plan — do **not** duplicate it here. → The contract surfaces only `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all`.

2. **Item wire shape is fixed by the Go handler** (`internal/notifications/item.go` + `handler.go:List`): the list endpoint returns `{ items: Item[], unread_count: int64 }`. Each `Item` is `{ id, type, payload (raw JSON object), read, invite_status?, created_at }`. `payload` is forwarded as a **nested object** (not an escaped string), denormalized per type. The mobile schema models `payload` as a free-form object and a `presentNotification` helper reads its fields defensively (exactly like `web/.../notification-presenter.ts`).

3. **`payload` typing.** `openapi-fetch` will type `payload` as `Record<string, never>` if we leave it `type: object` with no properties, which is unusable. We declare `NotificationPayload` with **all optional** fields (the union of every type's payload, mirroring the web `NotificationPayload`), and `additionalProperties: true` so unknown future fields don't break parsing. This matches the web client type 1:1.

4. **Bell lives in the shell header `action` slot of each list/index screen — start with Home; the notifications screen itself is a pushed route with `ZBackHeader`.** Mobile has no persistent web-style top app-bar; each tab screen renders its own `ZPageHeader`. The web puts the bell in the global navbar. The mobile counterpart is the `ZPageHeader` `action` slot on the **Home** tab (the natural landing screen — `ZPageHeader` stays reserved for the 5 tab index screens, so the bell host keeps it), reusing `z-icon-button` (Bell glyph) with a `z-badge`-style unread count overlaid. This is the adaptive-parity header rule (NOT the web navbar verbatim). The bell is **not** a FAB (it is a secondary/navigation action, not a primary create). The notifications screen at `/notifications` is a **pushed/detail route**, so it uses the shared **`ZBackHeader`** (WP-UI0) — back button + title + a trailing `action` slot for mark-all-read — **not** `ZPageHeader`.

5. **`mark-{one,all}-read` return 204** (`handler.go:159,182`) — the hooks treat `error === undefined` as success (no body), exactly like `useDeclineInvitationMutation` / `useLeaveGroupMutation`.

6. **Inline invite accept/decline reuses the EXISTING mobile hooks** (`useAcceptInvitationMutation` / `useDeclineInvitationMutation` in `mobile/src/api/queries/invitations.ts`). Those take a `{ code }` — the code comes from `item.payload.code`. No new invitation surface. After accept/decline we mark the row read and invalidate `['notifications']` so the badge + row state refresh.

6a. **Invite deep-link prefill requires a small `invite.tsx` change (Task N-3a).** `mobile/src/app/invite.tsx` today reads **no** route param — it initializes `code` from local state (`useState('')`) and only sets it from the QR scanner or the manual lookup form. So routing an invite notification to `{ pathname: '/invite', params: { code } }` would land on the empty capture phase, NOT the confirm phase — the param is silently dropped (this plan's earlier "already round-trips a `code`" claim was **false**). Task **N-3a** adds a `useLocalSearchParams` read in `invite.tsx` that seeds `code` from `params.code` on mount (entering the confirm phase + auto-loading the invitation via the existing `useInvitationInfoQuery(code)`), so the presenter's `/invite?code=…` deep-link actually prefills. The inline accept/decline in the notifications screen still uses the hooks directly (no navigation needed); the deep-link is for the row-tap "open" path.

7. **`notifications.*` i18n already exists on mobile** (synced from web — `mobile/src/i18n/locales/en.json:646`), including `types.*`, `invite.*`, `page.*`, `today`/`earlier`/`unread`/`markAllRead`/`empty`/`emptyDescription`/`open`. The **`today`/`earlier`** keys back the Today/Earlier day-section grouping (decision #8). The row timestamp goes through the shared **`formatRelativeTime`** in `mobile/src/lib/datetime.ts` (WP-UI0), which owns its own relative-time i18n keys — this plan does **not** add a `relativeTime.*` block. We **add one new key**, `notifications.loadFailed`, and reuse `open` for the bell label. Add it to the **web JSON source** first, then `sync:i18n`, then re-add mobile-only keys (sync is destructive — see memory: i18n sync drift).

8. **Today / Earlier day-section grouping (web parity).** The web `NotificationsStore.grouped` computed (`web/dashboard-next/src/app/features/notifications/notifications.store.ts:58`) buckets items into two day sections — **Today** and **Earlier** — keyed by `isSameDay(created_at, now)`, dropping empty buckets, and labelled `notifications.today` / `notifications.earlier`. The mobile screen reproduces this with a pure `groupByDay(items, now)` helper (Task N-5) feeding a **`SectionList`** (not a flat `FlatList`), so the inbox reads like the web. The two label keys already exist in the synced mobile JSON — no new i18n.

---

## FILE STRUCTURE

**Created:**

| File | Responsibility |
| --- | --- |
| `mobile/src/api/queries/notifications.ts` | React Query hooks: `useNotificationsQuery` (list + unread_count, polled), `useMarkNotificationReadMutation`, `useMarkAllNotificationsReadMutation`. Exported `NotificationItem` / `NotificationListResponse` types. |
| `mobile/src/api/queries/notifications.test.tsx` | Hook tests (fake injected client): list success/error, mark-read 204 + invalidation, mark-all-read 204 + invalidation, no-invalidate-on-error. |
| `mobile/src/lib/notification-presenter.ts` | Pure `presentNotification(item)` → `{ messageKey, params, href, icon }`. Mobile port of the web `notification-presenter.ts`; maps each type to its i18n key, interpolation params, expo-router deep-link, and icon name. |
| `mobile/src/lib/notification-presenter.test.ts` | Unit tests for every notification type's messageKey/params/href/icon, plus the no-actor and missing-id fallbacks. |
| `mobile/src/lib/notification-groups.ts` | Pure `groupByDay(items, now)` → Today/Earlier `SectionList` sections (empties dropped), mirroring the web `NotificationsStore.grouped` computed. Reuses existing `notifications.today`/`notifications.earlier` labels. |
| `mobile/src/lib/notification-groups.test.ts` | Unit tests: same-day → Today, older → Earlier, in order; empty buckets dropped; empty list → no sections. |
| `mobile/src/components/notification-row.tsx` | **NEW SHARED domain component.** One notification list row: `ZIconTile` (type icon, tone via WP-UI0 map) + message + relative time (shared `formatRelativeTime` from `lib/datetime.ts`) + unread dot + inline invite accept/decline buttons + resolved/expired states. Modelled on the web `notification-list.component.ts` row. Reuses `ZIconTile` + `ZButton`. |
| `mobile/src/components/notification-row.test.tsx` | Component tests: renders message + time; shows accept/decline only for actionable invite; hides them when resolved/expired; emits `onOpen`/`onAccept`/`onDecline`; renders unread dot only when unread. |
| `mobile/src/app/notifications.tsx` | The notifications screen (pushed route `/notifications`): `ZScreen` + `ZBackHeader` (title + mark-all-read trailing `action`) + a `SectionList` grouped into **Today / Earlier** (web parity) of `NotificationRow` with the four query states; wires mark-read on open + deep-link nav + inline invite mutations + toasts. |
| `mobile/src/__tests__/notifications-screen.test.tsx` | Screen tests: skeleton while pending, `ZQueryError` on error (before empty), `ZEmptyState` when empty, list when data, mark-all-read button visible only with unread. |

**Modified:**

| File | Responsibility |
| --- | --- |
| `docs/openapi.yaml` | Add `/notifications` (get `listNotifications`), `/notifications/{id}/read` (post `markNotificationRead`), `/notifications/read-all` (post `markAllNotificationsRead`); add schemas `NotificationItem`, `NotificationListResponse`, `NotificationPayload`. |
| `mobile/src/api/schema.d.ts` | Regenerated by `pnpm --dir mobile run generate:api` (never hand-edited). |
| `mobile/src/app/(tabs)/index.tsx` | Add the bell + unread badge to the Home `ZPageHeader` `action` slot, wired to `useNotificationsQuery()` unread count, routing to `/notifications`. |
| `mobile/src/app/invite.tsx` | **Task N-3a** — read `useLocalSearchParams<{ code?: string }>()` and seed `code` from `params.code` on mount so the presenter's `/invite?code=…` deep-link prefills the confirm phase + auto-loads the invitation. Today the screen ignores any route param. |
| `mobile/src/components/notification-bell.tsx` | **NEW** small shell component: `z-icon-button` (Bell) with an overlaid unread `z-badge` count; `onPress` navigates to `/notifications`. (Created file — listed here because it is consumed by the Home modification.) |
| `mobile/src/components/notification-bell.test.tsx` | **NEW** tests: renders bell, hides badge at count 0, shows "9+" above 9, calls onPress. |
| `web/dashboard-next/public/i18n/{en,de,fr}.json` | Add `notifications.loadFailed` so `sync:i18n` carries it to mobile. (Relative-time keys belong to WP-UI0's `lib/datetime.ts`; `today`/`earlier` already exist.) |
| `mobile/src/i18n/locales/{en,de,fr}.json` | Refreshed by `pnpm --dir mobile run sync:i18n` (then re-add any mobile-only keys by hand). |

---

## CONSTRAINTS (state in every commit / PR note)

- Single PR **#15**, branch **`feat/mobile-token-auth`**. Make **local commits per Task; do NOT push**.
- **Shared working tree:** Task N-3a (invite.tsx), N-7 (Home modification) and N-8/N-9 (screen) touch `src/app/` — the same tree a parallel session may edit. **Phase B (the screen-touching Tasks: N-3a + N-7…N-9) gates on the parallel session being done** — do not start them until the user signals it. Phase A (contract + hooks + presenter + grouping + row component, Tasks N-1, N-2, N-3, N-4, N-5, N-6) is collision-free and runs now. (Task N-3a is authored alongside N-3 in this plan's ordering for readability, but it is **executed in Phase B** because it edits `src/app/invite.tsx`.)
- **WP-UI0 prerequisite:** `ZBackHeader`, `ZIconTile`, and `lib/datetime.ts` (`formatRelativeTime`) from `20260613233000_mobile_shared_ui_foundation.md` must be merged before N-6/N-8 compile.
- **No shared-DB migration** (no Go/SQL change in this WP).
- **WSL tooling:** run every command via `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && <cmd>"`.

---

## Phase A — Contract + hooks + pure helpers + row component (collision-free, run now)

### Task N-1 — Contract: list + mark-read + mark-all-read

**Files:** `docs/openapi.yaml` (modify), `mobile/src/api/schema.d.ts` (regenerated).

- [ ] In `docs/openapi.yaml`, add the three path items. Place them after the `/groups/invitations/decline` block (line ~465, before `/assets/videos/{id}/reviews`) so notification paths sit together:

```yaml
  /notifications:
    get:
      tags: [notifications]
      summary: List the current user's recent notifications with the unread count
      operationId: listNotifications
      responses:
        "200":
          description: The 30 most recent notifications plus the unread count
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/NotificationListResponse"
        "401":
          description: Not authenticated
        "500":
          description: Failed to list notifications
  /notifications/{id}/read:
    post:
      tags: [notifications]
      summary: Mark a single notification as read
      operationId: markNotificationRead
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "204":
          description: Notification marked read (no-op if already read or not the recipient's)
        "400":
          description: Invalid notification ID
        "401":
          description: Not authenticated
        "500":
          description: Failed to update the notification
  /notifications/read-all:
    post:
      tags: [notifications]
      summary: Mark all of the current user's notifications as read
      operationId: markAllNotificationsRead
      responses:
        "204":
          description: All notifications marked read
        "401":
          description: Not authenticated
        "500":
          description: Failed to update notifications
```

- [ ] In the `components.schemas` section (after the `GroupInvitation` schema at line ~1343), add:

```yaml
    NotificationPayload:
      type: object
      description: >
        Denormalized, type-dependent payload. Every field is optional; which are
        present depends on the notification type. additionalProperties is allowed
        so new server fields do not break the client.
      additionalProperties: true
      properties:
        group_id: { type: string }
        group_name: { type: string }
        inviter_name: { type: string }
        code: { type: string }
        member_name: { type: string }
        asset_id: { type: string }
        video_title: { type: string }
        reviewer_name: { type: string }
        uploader_name: { type: string }
        booking_id: { type: string }
        student_name: { type: string }
        session_name: { type: string }
        scheduled_at: { type: string }
    NotificationItem:
      type: object
      description: A single in-app notification (list item / SSE frame shape).
      properties:
        id:
          type: string
          format: uuid
        type:
          type: string
          description: >
            One of group_invitation_received, group_member_joined, video_reviewed,
            video_uploaded, coaching_booking_created.
        payload:
          $ref: "#/components/schemas/NotificationPayload"
        read:
          type: boolean
        invite_status:
          type: string
          description: >
            pending | accepted | declined | expired. Present only for
            group_invitation_received; absent for live pushes (treated actionable).
        created_at:
          type: string
          format: date-time
      required: [id, type, payload, read, created_at]
    NotificationListResponse:
      type: object
      properties:
        items:
          type: array
          items:
            $ref: "#/components/schemas/NotificationItem"
        unread_count:
          type: integer
          format: int64
      required: [items, unread_count]
```

- [ ] If a `notifications` tag is not yet declared in the top-level `tags:` list, add `- name: notifications` there (match the existing tag-list style).
- [ ] Lint: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && make api:openapi:lint"` — expect **0 errors**. (The `/notifications/{id}/read` vs `/notifications/read-all` pair does not collide; `read-all` is a static segment chi resolves first — the same caveat already noted for `/groups/invitations/*`. If the linter warns about the ambiguity, add the same explanatory comment used above the `/groups/invitations/{code}` block.)
- [ ] Regenerate: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile run generate:api"`. Confirm `mobile/src/api/schema.d.ts` now exposes `'/notifications'`, `'/notifications/{id}/read'`, `'/notifications/read-all'` and `components['schemas']['NotificationItem' | 'NotificationListResponse' | 'NotificationPayload']`. Run it twice and confirm the second run produces no diff (idempotent).
- [ ] Commit: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add docs/openapi.yaml mobile/src/api/schema.d.ts && git commit -m 'feat(mobile): surface notifications list/read/read-all in contract'"`.

### Task N-2 — Notification query + mutation hooks

**Files:** `mobile/src/api/queries/notifications.ts` (create), `mobile/src/api/queries/notifications.test.tsx` (create).

- [ ] **Write the failing test first** — `mobile/src/api/queries/notifications.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

import {
  useNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from './notifications';

let client: QueryClient;

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});

afterEach(() => {
  client.clear();
});

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const LIST = {
  items: [
    {
      id: 'n1',
      type: 'group_invitation_received',
      payload: { group_name: 'Karate Club', inviter_name: 'Sam', code: 'aB3xZ9' },
      read: false,
      invite_status: 'pending',
      created_at: '2026-06-13T10:00:00Z',
    },
  ],
  unread_count: 1,
};

// ── useNotificationsQuery ─────────────────────────────────────────────────────

test('useNotificationsQuery returns items and unread_count', async () => {
  const GET = jest.fn(async () => ({ data: LIST, error: undefined }));
  const { result } = await renderHook(() => useNotificationsQuery({ GET } as never), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual(LIST);
  expect(GET).toHaveBeenCalledWith('/notifications');
});

test('useNotificationsQuery surfaces errors', async () => {
  const GET = jest.fn(async () => ({ data: undefined, error: { message: 'boom' } }));
  const { result } = await renderHook(() => useNotificationsQuery({ GET } as never), { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true));
});

// ── useMarkNotificationReadMutation ───────────────────────────────────────────

test('useMarkNotificationReadMutation posts the id and invalidates [notifications]', async () => {
  const POST = jest.fn(async () => ({ data: undefined, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (a: unknown) => void invalidated.push(a)) };
  const { result } = await renderHook(
    () => useMarkNotificationReadMutation({ POST } as never, qc as never),
    { wrapper },
  );
  await result.current.mutateAsync({ id: 'n1' });
  expect(POST).toHaveBeenCalledWith('/notifications/{id}/read', {
    params: { path: { id: 'n1' } },
  });
  expect(invalidated).toEqual(
    expect.arrayContaining([expect.objectContaining({ queryKey: ['notifications'] })]),
  );
});

test('useMarkNotificationReadMutation does not invalidate on error', async () => {
  const POST = jest.fn(async () => ({ data: undefined, error: { message: 'nope' } }));
  const qc = { invalidateQueries: jest.fn() };
  const { result } = await renderHook(
    () => useMarkNotificationReadMutation({ POST } as never, qc as never),
    { wrapper },
  );
  await expect(result.current.mutateAsync({ id: 'bad' })).rejects.toThrow();
  expect(qc.invalidateQueries).not.toHaveBeenCalled();
});

// ── useMarkAllNotificationsReadMutation ───────────────────────────────────────

test('useMarkAllNotificationsReadMutation posts read-all and invalidates [notifications]', async () => {
  const POST = jest.fn(async () => ({ data: undefined, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (a: unknown) => void invalidated.push(a)) };
  const { result } = await renderHook(
    () => useMarkAllNotificationsReadMutation({ POST } as never, qc as never),
    { wrapper },
  );
  await result.current.mutateAsync();
  expect(POST).toHaveBeenCalledWith('/notifications/read-all');
  expect(invalidated).toEqual(
    expect.arrayContaining([expect.objectContaining({ queryKey: ['notifications'] })]),
  );
});
```

- [ ] Run it, expect **FAIL** (module not found): `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/api/queries/notifications.test.tsx"` → `Cannot find module './notifications'`.

- [ ] **Minimal implementation** — `mobile/src/api/queries/notifications.ts`:

```ts
import { useMutation, useQuery } from '@tanstack/react-query';
import type { components } from '../schema';
import { api } from '../../auth/auth-store';
import { queryClient } from '../query-client';

export type NotificationItem = components['schemas']['NotificationItem'];
export type NotificationListResponse = components['schemas']['NotificationListResponse'];
export type NotificationPayload = components['schemas']['NotificationPayload'];

type Fetcher = Pick<typeof api, 'GET'>;
type Poster = Pick<typeof api, 'POST'>;
type Invalidator = Pick<typeof queryClient, 'invalidateQueries'>;

/** Poll the inbox so the bell badge + list stay fresh (mobile has no SSE; see plan). */
const REFETCH_INTERVAL_MS = 30_000;

export function useNotificationsQuery(client: Fetcher = api) {
  return useQuery({
    queryKey: ['notifications'],
    refetchInterval: REFETCH_INTERVAL_MS,
    queryFn: async () => {
      const { data, error } = await (client as typeof api).GET('/notifications');
      if (error || !data) throw new Error('Failed to load notifications');
      return data;
    },
  });
}

export function useMarkNotificationReadMutation(
  client: Poster = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async (input: { id: string }) => {
      const { error } = await (client as typeof api).POST('/notifications/{id}/read', {
        params: { path: { id: input.id } },
      });
      // 204 returns no body — treat error === undefined as success.
      if (error !== undefined) throw new Error('Failed to mark notification read');
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsReadMutation(
  client: Poster = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async () => {
      const { error } = await (client as typeof api).POST('/notifications/read-all');
      if (error !== undefined) throw new Error('Failed to mark all notifications read');
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
```

- [ ] Run it, expect **PASS**: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/api/queries/notifications.test.tsx"` → all green.
- [ ] Commit: `… git add mobile/src/api/queries/notifications.ts mobile/src/api/queries/notifications.test.tsx && git commit -m 'feat(mobile): notifications query + mark-read/all hooks'`.

### Task N-3 — Pure presenter (type → message/params/href/icon)

**Files:** `mobile/src/lib/notification-presenter.ts` (create), `mobile/src/lib/notification-presenter.test.ts` (create).

- [ ] **Write the failing test first** — `mobile/src/lib/notification-presenter.test.ts`:

```ts
import { presentNotification } from './notification-presenter';
import type { NotificationItem } from '../api/queries/notifications';

function make(partial: Partial<NotificationItem>): NotificationItem {
  return {
    id: 'n',
    type: 'group_invitation_received',
    payload: {},
    read: false,
    created_at: '2026-06-13T10:00:00Z',
    ...partial,
  } as NotificationItem;
}

test('group_invitation_received with an inviter uses the actor key and /invite href', () => {
  const v = presentNotification(
    make({ type: 'group_invitation_received', payload: { inviter_name: 'Sam', group_name: 'Karate', code: 'aB3xZ9' } }),
  );
  expect(v.messageKey).toBe('notifications.types.groupInvitationReceived');
  expect(v.params).toEqual({ inviter: 'Sam', group: 'Karate' });
  expect(v.href).toEqual({ pathname: '/invite', params: { code: 'aB3xZ9' } });
  expect(v.icon).toBe('invite');
});

test('group_invitation_received without an inviter uses the no-actor key', () => {
  const v = presentNotification(
    make({ type: 'group_invitation_received', payload: { group_name: 'Karate' } }),
  );
  expect(v.messageKey).toBe('notifications.types.groupInvitationReceivedNoActor');
  expect(v.href).toEqual({ pathname: '/invite', params: {} });
});

test('group_member_joined links to the group detail when group_id present', () => {
  const v = presentNotification(
    make({ type: 'group_member_joined', payload: { member_name: 'Lee', group_name: 'Karate', group_id: 'g1' } }),
  );
  expect(v.messageKey).toBe('notifications.types.groupMemberJoined');
  expect(v.params).toEqual({ member: 'Lee', group: 'Karate' });
  expect(v.href).toEqual({ pathname: '/group/[id]', params: { id: 'g1' } });
  expect(v.icon).toBe('member');
});

test('group_member_joined without group_id falls back to /groups', () => {
  const v = presentNotification(make({ type: 'group_member_joined', payload: { member_name: 'Lee' } }));
  expect(v.href).toEqual({ pathname: '/groups' });
});

test('video_reviewed links to the asset detail', () => {
  const v = presentNotification(
    make({ type: 'video_reviewed', payload: { video_title: 'Kata', reviewer_name: 'Coach', asset_id: 'a1' } }),
  );
  expect(v.messageKey).toBe('notifications.types.videoReviewed');
  expect(v.params).toEqual({ video: 'Kata', reviewer: 'Coach' });
  expect(v.href).toEqual({ pathname: '/asset/[id]', params: { id: 'a1' } });
  expect(v.icon).toBe('review');
});

test('video_uploaded with a group uses the group key, else the no-group key', () => {
  const withGroup = presentNotification(
    make({ type: 'video_uploaded', payload: { uploader_name: 'Lee', group_name: 'Karate', video_title: 'Kata', asset_id: 'a1' } }),
  );
  expect(withGroup.messageKey).toBe('notifications.types.videoUploaded');
  const noGroup = presentNotification(
    make({ type: 'video_uploaded', payload: { uploader_name: 'Lee', video_title: 'Kata', asset_id: 'a1' } }),
  );
  expect(noGroup.messageKey).toBe('notifications.types.videoUploadedNoGroup');
  expect(noGroup.icon).toBe('upload');
});

test('coaching_booking_created links to /coaching', () => {
  const v = presentNotification(
    make({ type: 'coaching_booking_created', payload: { student_name: 'Lee', session_name: 'Sparring' } }),
  );
  expect(v.messageKey).toBe('notifications.types.coachingBookingCreated');
  expect(v.params).toEqual({ student: 'Lee', session: 'Sparring' });
  expect(v.href).toEqual({ pathname: '/coaching' });
  expect(v.icon).toBe('booking');
});

test('unknown type falls back to the generic key and home href', () => {
  const v = presentNotification(make({ type: 'something_new' }));
  expect(v.messageKey).toBe('notifications.types.generic');
  expect(v.href).toEqual({ pathname: '/' });
  expect(v.icon).toBe('invite');
});
```

- [ ] Run it, expect **FAIL**: `… pnpm --dir mobile jest src/lib/notification-presenter.test.ts` → `Cannot find module './notification-presenter'`.

- [ ] **Minimal implementation** — `mobile/src/lib/notification-presenter.ts` (mobile port of the web presenter; the web deep-link for an invite is `/groups?invite=<code>`, whose mobile counterpart is the `/invite` screen. ⚠️ `invite.tsx` does **not** currently read a `code` param — Task **N-3a** adds that prefill so this `{ pathname: '/invite', params: { code } }` link actually lands on the confirm phase. Until N-3a lands the `code` param is inert):

```ts
import type { Href } from 'expo-router';
import type { NotificationItem } from '../api/queries/notifications';

export type NotificationIcon = 'invite' | 'member' | 'review' | 'upload' | 'booking';

export type NotificationPresentation = {
  messageKey: string;
  params: Record<string, string>;
  href: Href;
  icon: NotificationIcon;
};

/**
 * Maps a notification to its i18n key + interpolation params, expo-router
 * deep-link target, and icon name. Pure — unit-tested directly. Mobile port of
 * web/dashboard-next/src/app/features/notifications/notification-presenter.ts;
 * the only divergence is the deep-link, retargeted to the mobile routes
 * (invite screen instead of /groups?invite=, /group/[id], /asset/[id]).
 */
export function presentNotification(item: NotificationItem): NotificationPresentation {
  const p = item.payload ?? {};

  switch (item.type) {
    case 'group_invitation_received':
      return {
        messageKey: p.inviter_name
          ? 'notifications.types.groupInvitationReceived'
          : 'notifications.types.groupInvitationReceivedNoActor',
        params: { inviter: p.inviter_name ?? '', group: p.group_name ?? '' },
        href: { pathname: '/invite', params: p.code ? { code: p.code } : {} },
        icon: 'invite',
      };
    case 'group_member_joined':
      return {
        messageKey: 'notifications.types.groupMemberJoined',
        params: { member: p.member_name ?? '', group: p.group_name ?? '' },
        href: p.group_id ? { pathname: '/group/[id]', params: { id: p.group_id } } : { pathname: '/groups' },
        icon: 'member',
      };
    case 'video_reviewed':
      return {
        messageKey: 'notifications.types.videoReviewed',
        params: { video: p.video_title ?? '', reviewer: p.reviewer_name ?? '' },
        href: p.asset_id ? { pathname: '/asset/[id]', params: { id: p.asset_id } } : { pathname: '/videos' },
        icon: 'review',
      };
    case 'video_uploaded':
      return {
        messageKey: p.group_name
          ? 'notifications.types.videoUploaded'
          : 'notifications.types.videoUploadedNoGroup',
        params: { uploader: p.uploader_name ?? '', group: p.group_name ?? '', video: p.video_title ?? '' },
        href: p.asset_id ? { pathname: '/asset/[id]', params: { id: p.asset_id } } : { pathname: '/videos' },
        icon: 'upload',
      };
    case 'coaching_booking_created':
      return {
        messageKey: 'notifications.types.coachingBookingCreated',
        params: { student: p.student_name ?? '', session: p.session_name ?? '' },
        href: { pathname: '/coaching' },
        icon: 'booking',
      };
    default:
      return { messageKey: 'notifications.types.generic', params: {}, href: { pathname: '/' }, icon: 'invite' };
  }
}

/** True only for actionable group-invitation rows (offer accept/decline). */
export function isInvite(item: NotificationItem): boolean {
  return item.type === 'group_invitation_received';
}

/**
 * Resolution state for an invitation row, preferring the server-reported status.
 * Mobile has no optimistic client `inviteState` (the web store's field) — after
 * accept/decline we invalidate and re-read, so `invite_status` is the source of truth.
 */
export function resolvedInvite(item: NotificationItem): 'accepted' | 'declined' | null {
  if (item.invite_status === 'accepted') return 'accepted';
  if (item.invite_status === 'declined') return 'declined';
  return null;
}

/** Offer accept/decline only while the invitation is still actionable. */
export function showInviteActions(item: NotificationItem): boolean {
  return isInvite(item) && !resolvedInvite(item) && item.invite_status !== 'expired';
}
```

- [ ] If `Href`/`pathname` typing complains about the route strings, confirm the routes exist (`mobile/src/app/invite.tsx`, `mobile/src/app/group/[id].tsx`, `mobile/src/app/asset/[id].tsx`, the `(tabs)` routes). Use the typed-route form shown (`pathname` + `params`). Do NOT loosen to `any`.
- [ ] Run it, expect **PASS**: `… pnpm --dir mobile jest src/lib/notification-presenter.test.ts`.
- [ ] Commit: `… git add mobile/src/lib/notification-presenter.ts mobile/src/lib/notification-presenter.test.ts && git commit -m 'feat(mobile): pure notification presenter (type→message/href/icon)'`.

### Task N-3a — Make `invite.tsx` consume the `code` deep-link param (prefill + auto-load)

**Files:** `mobile/src/app/invite.tsx` (modify).

> **Why:** the presenter (N-3) deep-links invite rows to `{ pathname: '/invite', params: { code } }`, but `invite.tsx` today initializes `code` only from local state (`useState('')`) and the QR scanner / manual form — it **ignores** any route param, so the tap lands on the empty capture phase. This task seeds `code` from the route param on mount so the confirm phase + `useInvitationInfoQuery(code)` auto-load (decision #6a). ⚠️ `invite.tsx` lives under `mobile/src/app/` → **Phase B** (shared-tree, gated on the parallel session being done).

- [ ] **Write the failing test first** — extend `mobile/src/__tests__/invite-screen.test.tsx` (or create it if absent) with a case that mounts the screen with a `code` search param and asserts it enters the confirm phase (the capture-phase camera/manual UI is gone and the invitation query is invoked). Mock `expo-router`'s `useLocalSearchParams` to return `{ code: 'aB3xZ9' }` and `useInvitationInfoQuery` to a pending state; assert `screen.queryByTestId('invite-code-input')` is `null` (capture phase hidden) and the confirm-phase skeleton/loader renders:

```tsx
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({ code: 'aB3xZ9' }),
}));
// useInvitationInfoQuery mocked to { isPending: true, data: undefined } …
test('prefills the confirm phase from a code deep-link param', () => {
  render(<InviteScreen />);
  expect(screen.queryByTestId('invite-code-input')).toBeNull();
});
```

- [ ] Run it, expect **FAIL** (the param is ignored, so the capture-phase input still renders).

- [ ] **Minimal implementation** — in `mobile/src/app/invite.tsx`, import `useLocalSearchParams` and seed the initial `code` from the param, reusing `parseInviteCode` (case-preserving validation, matching the scanner/manual paths):

```tsx
import { useRouter, useLocalSearchParams } from 'expo-router';
// …
const params = useLocalSearchParams<{ code?: string }>();
const [code, setCode] = useState(() => parseInviteCode(params.code ?? ''));
```

`parseInviteCode` is already imported. The existing `isConfirmPhase = code !== ''` then evaluates `true` on mount when a valid param is present, and the existing `useInvitationInfoQuery(code)` auto-loads — no other change needed. `handleReset` (which clears `code`) still returns the user to the capture phase, which is correct.

- [ ] Run it, expect **PASS**.
- [ ] Confirm no regression to the no-param path: launching `/invite` with no param still starts in the capture phase (`parseInviteCode('') === ''`).
- [ ] Commit: `… git add mobile/src/app/invite.tsx mobile/src/__tests__/invite-screen.test.tsx && git commit -m 'fix(mobile): prefill invite confirm phase from code deep-link param'`.

### Task N-4 — i18n: add the new key, sync, re-add mobile-only keys

**Files:** `web/dashboard-next/public/i18n/{en,de,fr}.json` (modify), `mobile/src/i18n/locales/{en,de,fr}.json` (regenerated by sync, then hand-patched).

> **Note:** The row timestamp uses the shared `formatRelativeTime` from `mobile/src/lib/datetime.ts` (WP-UI0), which owns its own relative-time i18n keys — do **not** add a `notifications.relativeTime.*` block here. The only new key is `notifications.loadFailed`. The `today`/`earlier` grouping labels already exist in the synced JSON.

- [ ] Add to the `notifications` object in **`web/dashboard-next/public/i18n/en.json`** (the sync source) this key (do not touch existing keys):

```json
"loadFailed": "Couldn't load notifications"
```

- [ ] Mirror it in **`de.json`** (`"loadFailed": "Benachrichtigungen konnten nicht geladen werden"`) and **`fr.json`** (`"loadFailed": "Impossible de charger les notifications"`).
- [ ] Run sync: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile run sync:i18n"`. ⚠️ **Destructive** — it drops mobile-only keys (e.g. `sessions.call.sessionFallback`). After syncing, `git diff mobile/src/i18n/locales` and **re-add by hand any mobile-only keys it removed** (see memory: i18n sync drift). Confirm `notifications.loadFailed` now exists in all three mobile locale files and that `notifications.today` / `notifications.earlier` survived the sync.
- [ ] Commit: `… git add web/dashboard-next/public/i18n mobile/src/i18n/locales && git commit -m 'i18n(notifications): add loadFailed key, sync to mobile'`.

### Task N-5 — Today/Earlier grouping helper (web-parity buckets)

**Files:** `mobile/src/lib/notification-groups.ts` (create), `mobile/src/lib/notification-groups.test.ts` (create).

> **Why:** the web inbox renders two day sections — **Today** and **Earlier** (`web/.../notifications.store.ts:58` `grouped` computed). This pure helper reproduces that bucketing for the mobile `SectionList` (decision #8). The row timestamp itself uses the shared `formatRelativeTime` from `mobile/src/lib/datetime.ts` (WP-UI0) — this plan does NOT ship a relative-time helper.

- [ ] **Write the failing test first** — `mobile/src/lib/notification-groups.test.ts`:

```ts
import { groupByDay } from './notification-groups';
import type { NotificationItem } from '../api/queries/notifications';

const NOW = new Date('2026-06-13T12:00:00Z');
function make(id: string, createdAt: string): NotificationItem {
  return {
    id,
    type: 'group_member_joined',
    payload: {},
    read: false,
    created_at: createdAt,
  } as NotificationItem;
}

test('buckets same-day items into today and older into earlier, in order', () => {
  const items = [
    make('a', '2026-06-13T09:00:00Z'), // today
    make('b', '2026-06-12T23:00:00Z'), // earlier
    make('c', '2026-06-13T11:00:00Z'), // today
  ];
  const groups = groupByDay(items, NOW);
  expect(groups.map((g) => g.key)).toEqual(['today', 'earlier']);
  expect(groups[0]).toEqual({ key: 'today', titleKey: 'notifications.today', data: [items[0], items[2]] });
  expect(groups[1]).toEqual({ key: 'earlier', titleKey: 'notifications.earlier', data: [items[1]] });
});

test('drops empty buckets', () => {
  const groups = groupByDay([make('a', '2026-06-01T09:00:00Z')], NOW);
  expect(groups.map((g) => g.key)).toEqual(['earlier']);
});

test('returns no sections for an empty list', () => {
  expect(groupByDay([], NOW)).toEqual([]);
});
```

- [ ] Run it, expect **FAIL**: `… pnpm --dir mobile jest src/lib/notification-groups.test.ts` → module not found.

- [ ] **Minimal implementation** — `mobile/src/lib/notification-groups.ts`. Mirrors the web `grouped` computed (two buckets keyed by `isSameDay`, empties dropped), shaped for a `SectionList` (`title`/`data` via `titleKey`/`data`):

```ts
import type { NotificationItem } from '../api/queries/notifications';

export type NotificationDaySection = {
  key: 'today' | 'earlier';
  titleKey: string;
  data: NotificationItem[];
};

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Buckets notifications into Today / Earlier day sections for the SectionList,
 * dropping empty buckets — the mobile counterpart of the web NotificationsStore
 * `grouped` computed. `now` is injectable for deterministic tests.
 */
export function groupByDay(
  items: NotificationItem[],
  now: Date = new Date(),
): NotificationDaySection[] {
  const today: NotificationItem[] = [];
  const earlier: NotificationItem[] = [];
  for (const item of items) {
    (isSameDay(new Date(item.created_at), now) ? today : earlier).push(item);
  }
  return (
    [
      { key: 'today', titleKey: 'notifications.today', data: today },
      { key: 'earlier', titleKey: 'notifications.earlier', data: earlier },
    ] as NotificationDaySection[]
  ).filter((section) => section.data.length > 0);
}
```

- [ ] Run it, expect **PASS**: `… pnpm --dir mobile jest src/lib/notification-groups.test.ts`.
- [ ] Commit: `… git add mobile/src/lib/notification-groups.ts mobile/src/lib/notification-groups.test.ts && git commit -m 'feat(mobile): Today/Earlier grouping helper for notifications'`.

### Task N-6 — NotificationRow (NEW SHARED domain component)

**Files:** `mobile/src/components/notification-row.tsx` (create), `mobile/src/components/notification-row.test.tsx` (create).

- [ ] **Write the failing test first** — `mobile/src/components/notification-row.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';
import { NotificationRow } from './notification-row';
import type { NotificationItem } from '../api/queries/notifications';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}|${JSON.stringify(opts)}` : key,
  }),
}));

function make(partial: Partial<NotificationItem>): NotificationItem {
  return {
    id: 'n1',
    type: 'group_member_joined',
    payload: { member_name: 'Lee', group_name: 'Karate', group_id: 'g1' },
    read: true,
    created_at: new Date().toISOString(),
    ...partial,
  } as NotificationItem;
}

const noop = () => undefined;

test('renders the type message and fires onOpen when pressed', () => {
  const onOpen = jest.fn();
  render(
    <NotificationRow item={make({})} onOpen={onOpen} onAccept={noop} onDecline={noop} />,
  );
  expect(screen.getByText(/notifications\.types\.groupMemberJoined/)).toBeTruthy();
  fireEvent.press(screen.getByTestId('notification-row-n1'));
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test('shows an unread dot only when the item is unread', () => {
  const { rerender } = render(
    <NotificationRow item={make({ read: false })} onOpen={noop} onAccept={noop} onDecline={noop} />,
  );
  expect(screen.queryByTestId('notification-unread-dot')).toBeTruthy();
  rerender(
    <NotificationRow item={make({ read: true })} onOpen={noop} onAccept={noop} onDecline={noop} />,
  );
  expect(screen.queryByTestId('notification-unread-dot')).toBeNull();
});

test('renders accept/decline for an actionable invite and wires the callbacks', () => {
  const onAccept = jest.fn();
  const onDecline = jest.fn();
  const item = make({
    type: 'group_invitation_received',
    payload: { group_name: 'Karate', inviter_name: 'Sam', code: 'aB3xZ9' },
    invite_status: 'pending',
    read: false,
  });
  render(<NotificationRow item={item} onOpen={noop} onAccept={onAccept} onDecline={onDecline} />);
  fireEvent.press(screen.getByTestId('notification-accept-n1'));
  fireEvent.press(screen.getByTestId('notification-decline-n1'));
  expect(onAccept).toHaveBeenCalledWith(item);
  expect(onDecline).toHaveBeenCalledWith(item);
});

test('hides accept/decline once the invite is resolved or expired', () => {
  const resolved = make({
    type: 'group_invitation_received',
    payload: { group_name: 'Karate', code: 'aB3xZ9' },
    invite_status: 'accepted',
  });
  render(
    <NotificationRow item={resolved} onOpen={noop} onAccept={noop} onDecline={noop} />,
  );
  expect(screen.queryByTestId('notification-accept-n1')).toBeNull();
  expect(screen.getByText('notifications.invite.accepted|{"group":"Karate"}')).toBeTruthy();
});
```

- [ ] Run it, expect **FAIL**: `… pnpm --dir mobile jest src/components/notification-row.test.tsx` → module not found.

- [ ] **Minimal implementation** — `mobile/src/components/notification-row.tsx`. **SHARED** domain component; reuses the WP-UI0 **`ZIconTile`** for the per-type icon tile (tone→z-token map — no raw Tailwind palette), `ZButton` for actions, and the shared **`formatRelativeTime`** (`lib/datetime.ts`) for the timestamp. No inline hex; colors only via the `ZIconTile` tone map + NativeWind `z-*` classes:

```tsx
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
  Check,
  CircleCheck,
  FileVideo,
  UserRound,
  Users,
  X,
} from 'lucide-react-native';
import type { NotificationItem } from '../api/queries/notifications';
import {
  presentNotification,
  resolvedInvite,
  showInviteActions,
  type NotificationIcon,
} from '../lib/notification-presenter';
import { formatRelativeTime } from '../lib/datetime';
import { colors } from '../theme/colors';
import { ZButton } from './ui/z-button';
import { ZIconTile } from './ui/z-icon-tile';
import type { ZIconTileTone } from './ui/z-icon-tile';

/**
 * SHARED domain component — one notification list row. Mobile counterpart of the
 * web notification-list row (web/.../features/notifications/notification-list.component.ts):
 * a per-type ZIconTile, the localized message, a relative timestamp, an unread
 * dot, and inline accept/decline for actionable group invitations. Flagged SHARED
 * because the bell dropdown / any future inbox surface reuses the same row.
 *
 * Pressing the row (anywhere but the action buttons) fires `onOpen`. The screen
 * owns mark-read + navigation + the invite mutations; this component is presentational.
 */
// Per-type icon glyph + ZIconTile tone (WP-UI0 tone→z-token map — never raw
// bg-green-50/amber-50 or text-white).
const ICON_TONE: Record<NotificationIcon, ZIconTileTone> = {
  member: 'success',
  review: 'success',
  booking: 'warning',
  upload: 'primary',
  invite: 'neutral',
};

// ZIconTile maps tone→foreground; pass the matching glyph color so the lucide
// stroke matches the tile's foreground token.
const ICON_COLOR: Record<NotificationIcon, string> = {
  member: colors.success,
  review: colors.success,
  booking: colors.warning,
  upload: colors.onPrimary,
  invite: colors.primary,
};

function TypeGlyph({ icon }: { icon: NotificationIcon }) {
  const color = ICON_COLOR[icon];
  switch (icon) {
    case 'member':
      return <UserRound color={color} size={18} />;
    case 'review':
      return <CircleCheck color={color} size={18} />;
    case 'upload':
      return <FileVideo color={color} size={18} />;
    case 'booking':
      return <CalendarDays color={color} size={18} />;
    default:
      return <Users color={color} size={18} />;
  }
}

export function NotificationRow({
  item,
  onOpen,
  onAccept,
  onDecline,
}: {
  item: NotificationItem;
  onOpen: (item: NotificationItem) => void;
  onAccept: (item: NotificationItem) => void;
  onDecline: (item: NotificationItem) => void;
}) {
  const { t } = useTranslation();
  const view = presentNotification(item);
  const unread = !item.read;
  const resolved = resolvedInvite(item);

  return (
    <Pressable
      testID={`notification-row-${item.id}`}
      accessibilityRole="button"
      accessibilityLabel={t(view.messageKey, view.params)}
      onPress={() => onOpen(item)}
      className={`flex-row items-start gap-3 rounded-lg border border-z-border p-3 active:bg-z-surface-warm ${
        unread ? 'bg-z-surface-warm' : 'bg-z-surface'
      }`}
    >
      <ZIconTile
        tone={ICON_TONE[view.icon]}
        size="sm"
        icon={<TypeGlyph icon={view.icon} />}
      />

      <View className="min-w-0 flex-1">
        <Text className="text-sm leading-5 text-z-text">{t(view.messageKey, view.params)}</Text>
        <Text className="mt-0.5 text-xs text-z-muted">{formatRelativeTime(item.created_at, t)}</Text>

        {showInviteActions(item) ? (
          <View className="mt-2 flex-row gap-2">
            <ZButton
              testID={`notification-accept-${item.id}`}
              label={t('notifications.invite.accept')}
              onPress={() => onAccept(item)}
            />
            <ZButton
              testID={`notification-decline-${item.id}`}
              variant="secondary"
              label={t('notifications.invite.decline')}
              onPress={() => onDecline(item)}
            />
          </View>
        ) : resolved === 'accepted' ? (
          <View className="mt-2 flex-row items-center gap-1.5">
            <Check color={colors.success} size={14} />
            <Text className="text-xs font-semibold text-z-success">
              {t('notifications.invite.accepted', { group: item.payload.group_name })}
            </Text>
          </View>
        ) : resolved === 'declined' ? (
          <View className="mt-2 flex-row items-center gap-1.5">
            <X color={colors.muted} size={14} />
            <Text className="text-xs font-semibold text-z-muted">
              {t('notifications.invite.declined')}
            </Text>
          </View>
        ) : item.type === 'group_invitation_received' && item.invite_status === 'expired' ? (
          <Text className="mt-2 text-xs font-semibold text-z-muted">
            {t('notifications.invite.expired')}
          </Text>
        ) : null}
      </View>

      {unread ? (
        <View
          testID="notification-unread-dot"
          accessibilityLabel={t('notifications.unread')}
          className="mt-1.5 h-2 w-2 rounded-full bg-z-primary"
        />
      ) : null}
    </Pressable>
  );
}
```

- [ ] Confirm `ZButton` accepts `variant="secondary"` + `label`/`onPress`/`testID` (it does — see `mobile/src/components/ui/z-button.tsx`). ⚠️ `ZButton` has **no `size` prop** (variants are `'primary' | 'secondary' | 'ghost' | 'danger' | 'link'` and all share one size) — do NOT pass `size="sm"`. The inline accept (default `primary`) / decline (`secondary`) buttons sit in a `flex-row gap-2`, so they size to their labels; no size variant is needed. Confirm `ZIconTile` exposes `tone`/`size`/`icon` per WP-UI0 (`mobile/src/components/ui/z-icon-tile.tsx`) and that `ZIconTileTone` is its exported tone union.
- [ ] Run it, expect **PASS**: `… pnpm --dir mobile jest src/components/notification-row.test.tsx`.
- [ ] Commit: `… git add mobile/src/components/notification-row.tsx mobile/src/components/notification-row.test.tsx && git commit -m 'feat(mobile): SHARED notification-row domain component'`.

### Phase A gate

- [ ] Run the four new Phase-A test files together: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/api/queries/notifications.test.tsx src/lib/notification-presenter.test.ts src/lib/notification-groups.test.ts src/components/notification-row.test.tsx"` → all green. (Do NOT run the full mobile suite while the parallel session has in-flight `src/app/` files. ⚠️ `notification-row.test.tsx` and `notification-groups.test.ts` depend on WP-UI0's `ZIconTile` + `lib/datetime.ts` being present — WP-UI0 lands first.)
- [ ] `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && make api:openapi:lint"` → 0 errors.

---

## Phase B — invite deep-link + shell bell + screen (gated on the parallel session being done)

⚠️ **Tasks N-3a, N-7, N-8, N-9 touch `mobile/src/app/` (the shared tree). Do not start until the user signals the parallel session is finished. Run N-3a (authored above, under Phase A's numbering for readability) here in Phase B before N-8 so the screen's deep-link target works.** Also confirm WP-UI0 (`ZBackHeader`/`ZIconTile`/`lib/datetime.ts`) is merged — N-8 imports `ZBackHeader` and N-6's row imports `ZIconTile`.

### Task N-7 — NotificationBell (shell component) + Home wiring

**Files:** `mobile/src/components/notification-bell.tsx` (create), `mobile/src/components/notification-bell.test.tsx` (create), `mobile/src/app/(tabs)/index.tsx` (modify).

- [ ] **Write the failing test first** — `mobile/src/components/notification-bell.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';
import { NotificationBell } from './notification-bell';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

test('renders the bell and calls onPress', () => {
  const onPress = jest.fn();
  render(<NotificationBell unreadCount={0} onPress={onPress} />);
  fireEvent.press(screen.getByTestId('notification-bell'));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('hides the badge when there are no unread notifications', () => {
  render(<NotificationBell unreadCount={0} onPress={() => undefined} />);
  expect(screen.queryByTestId('notification-bell-badge')).toBeNull();
});

test('shows the exact count up to 9 and 9+ above', () => {
  const { rerender } = render(<NotificationBell unreadCount={3} onPress={() => undefined} />);
  expect(screen.getByTestId('notification-bell-badge')).toHaveTextContent('3');
  rerender(<NotificationBell unreadCount={42} onPress={() => undefined} />);
  expect(screen.getByTestId('notification-bell-badge')).toHaveTextContent('9+');
});
```

- [ ] Run it, expect **FAIL**: `… pnpm --dir mobile jest src/components/notification-bell.test.tsx` → module not found.

- [ ] **Minimal implementation** — `mobile/src/components/notification-bell.tsx`. Reuses `z-icon-button` (Bell) with a small unread count overlaid; the count uses the `z-badge` danger styling tokens via NativeWind classes (no raw hex). The badge mirrors the web `badge` computed (`> 9 → '9+'`):

```tsx
import { View, Text } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { ZIconButton } from './ui/z-icon-button';

/**
 * Shell bell + unread-count badge. The mobile counterpart of the web navbar bell
 * (web/.../core/state/notifications.store badge computed). Lives in a list/index
 * screen header `action` slot (Home). Secondary navigation action — not a FAB.
 */
export function NotificationBell({
  unreadCount,
  onPress,
}: {
  unreadCount: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const badge = unreadCount > 9 ? '9+' : String(unreadCount);
  return (
    <View>
      <ZIconButton
        testID="notification-bell"
        label={t('notifications.open')}
        variant="secondary"
        onPress={onPress}
      >
        <Bell color={colors.text} size={18} />
      </ZIconButton>
      {unreadCount > 0 ? (
        <View
          testID="notification-bell-badge"
          accessibilityLabel={t('notifications.unread')}
          className="absolute -right-1 -top-1 min-w-[18px] items-center justify-center rounded-full border border-z-surface bg-z-danger px-1"
        >
          {/* Danger-pill foreground = the onPrimary token (white-on-color) from
              theme/colors.ts, not a raw `text-white` class. There is no
              `z-on-primary` NativeWind class in tailwind.config.js, so the token
              flows in via `style` (theme/colors.ts is the sanctioned non-class
              color source per mobile/AGENTS.md). */}
          <Text className="text-[10px] font-bold" style={{ color: colors.onPrimary }}>
            {badge}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
```

- [ ] Run it, expect **PASS**: `… pnpm --dir mobile jest src/components/notification-bell.test.tsx`.
- [ ] **Wire into Home** — `mobile/src/app/(tabs)/index.tsx`. Add the import, read the unread count from the polled query, and pass the bell as the `ZPageHeader` `action`:

```tsx
import { useNotificationsQuery } from '../../api/queries/notifications';
import { NotificationBell } from '../../components/notification-bell';
```

Inside `HomeScreen`, after the other queries:

```tsx
  const notifications = useNotificationsQuery();
  const unreadCount = notifications.data?.unread_count ?? 0;
```

Replace the bare `<ZPageHeader title={t('common.nav.home')} />` with:

```tsx
      <ZPageHeader
        title={t('common.nav.home')}
        action={
          <NotificationBell
            unreadCount={unreadCount}
            onPress={() => router.push('/notifications')}
          />
        }
      />
```

- [ ] Commit: `… git add mobile/src/components/notification-bell.tsx mobile/src/components/notification-bell.test.tsx mobile/src/app/(tabs)/index.tsx && git commit -m 'feat(mobile): notification bell + unread badge in Home header'`.

### Task N-8 — Notifications screen

**Files:** `mobile/src/app/notifications.tsx` (create), `mobile/src/__tests__/notifications-screen.test.tsx` (create).

- [ ] **Write the failing test first** — `mobile/src/__tests__/notifications-screen.test.tsx`. Mock the hook module and expo-router; assert the four states + the mark-all-read affordance:

```tsx
import { render, screen } from '@testing-library/react-native';

// ZBackHeader (WP-UI0) calls useRouter().back() for its default onBack, so the
// mock must expose `back` as well as `push`.
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

const mockUseNotifications = jest.fn();
const mockMarkRead = { mutate: jest.fn(), mutateAsync: jest.fn() };
const mockMarkAll = { mutate: jest.fn(), mutateAsync: jest.fn() };
const mockAccept = { mutateAsync: jest.fn() };
const mockDecline = { mutateAsync: jest.fn() };

jest.mock('../api/queries/notifications', () => ({
  useNotificationsQuery: () => mockUseNotifications(),
  useMarkNotificationReadMutation: () => mockMarkRead,
  useMarkAllNotificationsReadMutation: () => mockMarkAll,
}));
jest.mock('../api/queries/invitations', () => ({
  useAcceptInvitationMutation: () => mockAccept,
  useDeclineInvitationMutation: () => mockDecline,
}));

import NotificationsScreen from '../app/notifications';

const item = {
  id: 'n1',
  type: 'group_member_joined',
  payload: { member_name: 'Lee', group_name: 'Karate', group_id: 'g1' },
  read: false,
  created_at: new Date().toISOString(),
};

test('renders a skeleton while pending', async () => {
  mockUseNotifications.mockReturnValue({ isPending: true, isError: false, data: undefined });
  render(<NotificationsScreen />);
  expect(await screen.findByTestId('notifications-skeleton')).toBeTruthy();
});

test('renders the query error before the empty state', async () => {
  mockUseNotifications.mockReturnValue({
    isPending: false,
    isError: true,
    data: undefined,
    refetch: jest.fn(),
  });
  render(<NotificationsScreen />);
  expect(await screen.findByTestId('notifications-error-retry')).toBeTruthy();
});

test('renders the empty state when there are no notifications', async () => {
  mockUseNotifications.mockReturnValue({
    isPending: false,
    isError: false,
    data: { items: [], unread_count: 0 },
    refetch: jest.fn(),
  });
  render(<NotificationsScreen />);
  expect(await screen.findByTestId('notifications-empty')).toBeTruthy();
});

test('renders rows and the mark-all-read action when there are unread items', async () => {
  mockUseNotifications.mockReturnValue({
    isPending: false,
    isError: false,
    data: { items: [item], unread_count: 1 },
    refetch: jest.fn(),
    isRefetching: false,
  });
  render(<NotificationsScreen />);
  expect(await screen.findByTestId('notification-row-n1')).toBeTruthy();
  expect(screen.getByTestId('notifications-mark-all')).toBeTruthy();
  // The item's created_at is `now`, so it lands in the Today section.
  expect(screen.getByText('notifications.today')).toBeTruthy();
});

test('hides mark-all-read when there are no unread items', async () => {
  mockUseNotifications.mockReturnValue({
    isPending: false,
    isError: false,
    data: { items: [{ ...item, read: true }], unread_count: 0 },
    refetch: jest.fn(),
    isRefetching: false,
  });
  render(<NotificationsScreen />);
  expect(await screen.findByTestId('notification-row-n1')).toBeTruthy();
  expect(screen.queryByTestId('notifications-mark-all')).toBeNull();
});
```

- [ ] Run it, expect **FAIL**: `… pnpm --dir mobile jest src/__tests__/notifications-screen.test.tsx` → cannot find `../app/notifications`.

- [ ] **Minimal implementation** — `mobile/src/app/notifications.tsx`. Four query states (error checked **before** empty), a `SectionList` grouped into **Today / Earlier** with real-id `keyExtractor`, **`ZBackHeader`** (pushed route — WP-UI0) with a conditional mark-all-read trailing `action`, mark-read-on-open + deep-link nav, inline invite mutations + toasts:

```tsx
import { RefreshControl, SectionList, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, CheckCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
  useNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  type NotificationItem,
} from '../api/queries/notifications';
import {
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
} from '../api/queries/invitations';
import { NotificationRow } from '../components/notification-row';
import { ZBackHeader } from '../components/ui/z-back-header';
import { ZButton } from '../components/ui/z-button';
import { ZEmptyState } from '../components/ui/z-empty-state';
import { ZQueryError } from '../components/ui/z-query-error';
import { ZScreen } from '../components/ui/z-screen';
import { ZSkeleton } from '../components/ui/z-skeleton';
import { showToast } from '../components/ui/z-toast';
import { groupByDay } from '../lib/notification-groups';
import { presentNotification } from '../lib/notification-presenter';
import { colors } from '../theme/colors';

function ListSkeleton() {
  return (
    <View testID="notifications-skeleton" className="gap-3 p-4">
      {[0, 1, 2, 3].map((i) => (
        <View key={i} className="flex-row gap-3 rounded-lg border border-z-border bg-z-surface p-3">
          <ZSkeleton className="h-9 w-9 rounded-md" />
          <View className="flex-1 justify-center gap-2">
            <ZSkeleton className="h-3.5 w-4/5" />
            <ZSkeleton className="h-3 w-1/3" />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isPending, isError, refetch, isRefetching } = useNotificationsQuery();
  const markRead = useMarkNotificationReadMutation();
  const markAll = useMarkAllNotificationsReadMutation();
  const accept = useAcceptInvitationMutation();
  const decline = useDeclineInvitationMutation();

  const items = data?.items ?? [];
  const unreadCount = data?.unread_count ?? 0;
  const sections = groupByDay(items);

  function onOpen(item: NotificationItem) {
    if (!item.read) markRead.mutate({ id: item.id });
    router.push(presentNotification(item).href);
  }

  async function onAccept(item: NotificationItem) {
    const code = item.payload.code;
    if (!code) return;
    try {
      await accept.mutateAsync({ code });
      if (!item.read) await markRead.mutateAsync({ id: item.id });
    } catch {
      showToast(t('notifications.invite.errorTitle'), t('notifications.invite.acceptError'), 'error');
    }
  }

  async function onDecline(item: NotificationItem) {
    const code = item.payload.code;
    if (!code) return;
    try {
      await decline.mutateAsync({ code });
      if (!item.read) await markRead.mutateAsync({ id: item.id });
    } catch {
      showToast(t('notifications.invite.errorTitle'), t('notifications.invite.declineError'), 'error');
    }
  }

  let content: React.ReactNode;
  if (isPending) {
    content = <ListSkeleton />;
  } else if (isError) {
    content = (
      <View className="flex-1 justify-center p-4">
        <ZQueryError
          title={t('notifications.loadFailed')}
          onRetry={() => void refetch()}
          testID="notifications-error-retry"
        />
      </View>
    );
  } else if (items.length === 0) {
    content = (
      <View testID="notifications-empty" className="flex-1 justify-center p-4">
        <ZEmptyState
          title={t('notifications.empty')}
          description={t('notifications.emptyDescription')}
          icon={<Bell color={colors.primary} size={24} />}
        />
      </View>
    );
  } else {
    content = (
      <SectionList
        sections={sections}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
        renderSectionHeader={({ section }) => (
          <Text className="pb-1 pt-2 text-xs font-semibold uppercase text-z-muted">
            {t(section.titleKey)}
          </Text>
        )}
        renderItem={({ item }) => (
          <NotificationRow item={item} onOpen={onOpen} onAccept={onAccept} onDecline={onDecline} />
        )}
      />
    );
  }

  return (
    <ZScreen edges={['top']}>
      <ZBackHeader
        title={t('notifications.title')}
        action={
          unreadCount > 0 ? (
            <ZButton
              testID="notifications-mark-all"
              label={t('notifications.markAllRead')}
              variant="secondary"
              onPress={() => markAll.mutate()}
              icon={<CheckCheck color={colors.text} size={16} />}
            />
          ) : undefined
        }
      />
      {content}
    </ZScreen>
  );
}
```

- [ ] Confirm `ZButton` supports an `icon` prop (it does — see Groups tab `groups-join` button) and `ZBackHeader` accepts an optional `action` (per WP-UI0 its `action?: ReactNode` slot — passing `undefined` renders no trailing action). `ZBackHeader`'s default `onBack` is `router.back()` — no `onBack` prop is needed here. Confirm `router.push(href)` accepts the typed `Href` object from `presentNotification`. If the typed-route signature rejects the object form, fall back to `router.push(presentNotification(item).href as never)` only as a last resort and note it; prefer fixing the `Href` typing.
- [ ] Note: `SectionList`'s `section` carries the `titleKey` from `groupByDay` (Task N-5); `gap: 12` in `contentContainerStyle` spaces rows + headers like the old flat list. `NotificationRow` already renders its own border/padding, so no `ItemSeparatorComponent` is needed.
- [ ] Run it, expect **PASS**: `… pnpm --dir mobile jest src/__tests__/notifications-screen.test.tsx`.
- [ ] Commit: `… git add mobile/src/app/notifications.tsx mobile/src/__tests__/notifications-screen.test.tsx && git commit -m 'feat(mobile): notifications center screen'`.

### Task N-9 — Full mobile gates + screenshots

**Files:** none (verification only).

- [ ] `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && make mobile:typecheck"` → clean.
- [ ] `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && make mobile:lint"` → clean.
- [ ] `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && make mobile:test"` → green (now safe to run the full suite — the parallel session is done).
- [ ] Emulator screenshots for the PR body: **Home** header showing the bell + unread badge; the **Notifications screen** (with its `ZBackHeader`) in three states — populated list showing the **Today / Earlier** sections (with an actionable invite row), empty state, and loading skeleton. (Emulator setup: see memory: emulator test setup.)
- [ ] No commit (verification only). If lint/typecheck forces a code touch, commit that fix with a `fix(mobile):` message.

---

## Verification

- **Phase A:** `make api:openapi:lint` → 0 errors; `generate:api` idempotent and exposes the three operations + three schemas; the four Phase-A test files green (`notifications.test.tsx`, `notification-presenter.test.ts`, `notification-groups.test.ts`, `notification-row.test.tsx` — the last needs WP-UI0's `ZIconTile`/`lib/datetime.ts`); no Go change (Go suite unaffected). Adversarial review: contract ↔ `internal/notifications/handler.go`+`item.go` fidelity (204s, `unread_count` int64, `payload` nested object); hook pattern parity with `groups.ts`/`invitations.ts`; presenter parity with the web `notification-presenter.ts` (every type + no-actor + missing-id fallbacks); grouping parity with `notifications.store.ts` `grouped` (Today/Earlier, empties dropped).
- **Phase B:** `make mobile:lint` / `mobile:typecheck` / `mobile:test` green; emulator screenshots attached. Web-parity spot check: the screen header is `ZBackHeader` (pushed route, not `ZPageHeader`); the list is grouped into **Today / Earlier** sections (web `grouped` parity); the row reproduces the web row's elements (`ZIconTile` per-type tile, message, shared `formatRelativeTime`, unread indicator, inline accept/decline, resolved/expired text); the bell reproduces the web navbar bell's count + "9+" behaviour with the count text using `colors.onPrimary` (no raw `text-white`); tapping an invite row deep-links to `/invite?code=…` and prefills the confirm phase (N-3a).

## UI Parity & Component Reuse

Header treatment: the **notifications screen is a pushed/detail route → shared `ZBackHeader`** (WP-UI0) — back button + title + a `mark-all-read` trailing `action`, shown only when `unread_count > 0`. `ZPageHeader` stays reserved for the 5 tab index screens, so it is **not** used on this pushed route. The screen has **no FAB** (there is no "create notification" primary action). The **bell** is a secondary navigation action placed in the **Home** tab index screen's `ZPageHeader` `action` slot (that host stays `ZPageHeader` because Home is a tab index) — adaptive parity with the web navbar bell, NOT a verbatim port of a web top app-bar, which mobile does not have.

| Screen element | Reuses (existing primitive/domain component + path) | New? |
| --- | --- | --- |
| Screen root (safe-area) | `ZScreen` — `mobile/src/components/ui/z-screen.tsx` | reuse |
| Screen header (back + title + mark-all-read action) | **`ZBackHeader`** (WP-UI0) — `mobile/src/components/ui/z-back-header.tsx` (pushed route, NOT `ZPageHeader`) | reuse (WP-UI0) |
| Mark-all-read button (header action) | `ZButton` (variant secondary, CheckCheck icon) — `mobile/src/components/ui/z-button.tsx` | reuse |
| Per-type icon tile (notification row) | **`ZIconTile`** (WP-UI0) — `mobile/src/components/ui/z-icon-tile.tsx`, `tone`→z-token map (success/warning/primary/neutral), `size='sm'` | reuse (WP-UI0) |
| Relative timestamp (row) | **`formatRelativeTime`** — `mobile/src/lib/datetime.ts` (WP-UI0); single shared formatter, no per-screen helper | reuse (WP-UI0) |
| Today / Earlier day sections | `groupByDay` — `mobile/src/lib/notification-groups.ts` feeding a `SectionList`; mirrors web `NotificationsStore.grouped` | NEW pure helper |
| Shell bell (icon control) | `ZIconButton` (Bell glyph) — `mobile/src/components/ui/z-icon-button.tsx`, wrapped by `NotificationBell` | reuse (inside new shell cmp) |
| Unread count overlay on the bell | NativeWind `z-danger`/`z-surface` classes + `colors.onPrimary` (theme token) for the count text; mirrors web `z-badge` "9+" computed — no raw `text-white` | reuse tokens (in `NotificationBell`) |
| Per-row status/role-style pill (resolved invite) | rendered as inline `Check`/`X` + `text-z-success`/`text-z-muted` (matches web row); no hand-rolled `rounded-full` control | reuse tokens |
| List container | `SectionList` (Today/Earlier sections) with real-id `keyExtractor` (`it.id`) + `RefreshControl` | RN core (per list rule) |
| Loading state | `ZSkeleton` — `mobile/src/components/ui/z-skeleton.tsx` (4 placeholder rows) | reuse |
| Error state (checked before empty) | `ZQueryError` (+ retry) — `mobile/src/components/ui/z-query-error.tsx` | reuse |
| Empty state | `ZEmptyState` (Bell icon) — `mobile/src/components/ui/z-empty-state.tsx` | reuse |
| Inline invite accept/decline buttons | `ZButton` (default primary / secondary — **no `size` prop exists**) — `mobile/src/components/ui/z-button.tsx` | reuse |
| Invite accept/decline behaviour | `useAcceptInvitationMutation` / `useDeclineInvitationMutation` — `mobile/src/api/queries/invitations.ts` | reuse (existing hooks) |
| Invite deep-link prefill | `mobile/src/app/invite.tsx` reads `useLocalSearchParams().code` (Task N-3a) so the row-tap `/invite?code=…` lands on the confirm phase | modify (existing screen) |
| Mutation feedback | error → `showToast(... 'error')` — `mobile/src/components/ui/z-toast.tsx` | reuse |
| **Notification list row** | `ZIconTile` (WP-UI0) + `ZButton` + lucide glyph + shared `formatRelativeTime` composed inside | **NEW `mobile/src/components/notification-row.tsx` — FLAG: SHARED** (counterpart of the web `notification-list.component.ts` row; any future bell dropdown / inbox reuses it) |
| **Shell bell + badge wrapper** | composes `ZIconButton` + a `z-danger` count pill | **NEW `mobile/src/components/notification-bell.tsx`** (counterpart of the web navbar bell; shell-local — not flagged SHARED, but lives in `components/` so any other screen header can drop it in) |

No new `z-*` **primitive** is introduced — both new files are domain components composed entirely from existing primitives, so no new Storybook/primitive note is required. The new components are justified (no existing domain component renders a typed notification row or a count-badged bell), named after their web counterparts, and live in `mobile/src/components/`.

## Self-Review

**Spec coverage (every WP3 requirement maps to a Task):**
- Surface list + unread_count, mark-read, mark-all-read → **N-1** (contract) + **N-2** (hooks). SSE `/stream` intentionally excluded (Bearer-vs-cookie auth; poll via `refetchInterval` instead — decision #1).
- Bell + badge in the shell header → **N-7** (`NotificationBell` + Home `ZPageHeader` action — the bell host is the Home tab index, which keeps `ZPageHeader`).
- Notifications screen (pushed route with `ZBackHeader`; list, unread/read, mark-read/all, navigate-to-target, inline invite accept/decline via existing invitation hooks; Today/Earlier sections) → **N-8** (screen) using **N-6** (`NotificationRow`) + **N-3** (presenter/deep-link) + **N-5** (`groupByDay`) + existing `invitations.ts` hooks.
- Invite deep-link actually prefills the invite confirm phase → **N-3a** (adds the `code` param read in `invite.tsx`).
- Row = NEW shared domain component built on WP-UI0 `ZIconTile` + shared `formatRelativeTime`, no raw Tailwind palette / `text-white`, FLAGGED SHARED → **N-6** + the parity table.
- List=`SectionList` (Today/Earlier), empty=ZEmptyState, loading=ZSkeleton, error=ZQueryError (error before empty) → **N-8** + its tests.
- Today/Earlier grouping parity with the web `NotificationsStore.grouped` → **N-5** (`groupByDay`) feeding the `SectionList`; labels reuse existing `notifications.today`/`notifications.earlier`.
- i18n from web JSON source + sync → **N-4** (only `loadFailed` is new; `types.*`/`invite.*`/`page.*`/`today`/`earlier` already synced; the row timestamp uses WP-UI0's `formatRelativeTime`, which owns its own keys).

**WP-UI0 dependency:** this plan consumes `ZBackHeader`, `ZIconTile` (+ `ZIconTileTone`), and `formatRelativeTime` from `lib/datetime.ts` — all defined in `20260613233000_mobile_shared_ui_foundation.md`. WP-UI0 lands first; N-6 and N-8 (and their tests) reference these by the exact WP-UI0 names/props.

**Placeholder scan:** no "TBD"/"add validation"/"handle edge cases"/"similar to Task N". Every file has real code; every test has real assertions; every command is a concrete WSL invocation.

**Type/name consistency:** `NotificationItem` / `NotificationListResponse` / `NotificationPayload` are defined in the contract (N-1), re-exported from `notifications.ts` (N-2), and consumed by the presenter (N-3), grouping helper (N-5), row (N-6), screen (N-8). `presentNotification` / `isInvite` / `resolvedInvite` / `showInviteActions` / `NotificationIcon` all defined in N-3 and used in N-6. `groupByDay` / `NotificationDaySection` defined in N-5, used in N-8. `NotificationRow` defined in N-6, used in N-8. `NotificationBell` defined in N-7, used in N-7's Home edit. Hooks `useNotificationsQuery` / `useMarkNotificationReadMutation` / `useMarkAllNotificationsReadMutation` defined in N-2, used in N-7 + N-8. WP-UI0 symbols (`ZBackHeader`, `ZIconTile`, `ZIconTileTone`, `formatRelativeTime`) referenced by exact name/props. Existing reused symbols (`useAcceptInvitationMutation`, `useDeclineInvitationMutation`, `useLocalSearchParams`, `parseInviteCode`, `ZScreen`, `ZButton`, `ZIconButton`, `ZSkeleton`, `ZQueryError`, `ZEmptyState`, `showToast`) were each read in the named source files; their props match observed signatures — notably **`ZButton` exposes `label`/`onPress`/`variant`/`disabled`/`loading`/`icon`/`testID` and NO `size`** (verified against `mobile/src/components/ui/z-button.tsx`), so no `size="sm"` is passed anywhere. i18n keys referenced (`notifications.title/open/markAllRead/empty/emptyDescription/unread/today/earlier/invite.*/types.*` + new `loadFailed`) all exist after N-4.

**Known risks flagged in-plan:**
- expo-router typed-route (`Href`) acceptance of the object `pathname`+`params` form (N-3/N-8) — verify typed routes; cast only as a last resort.
- No raw hex / `text-white` (icon-tile colors come from `ZIconTile`'s tone→z-token map; the bell count text uses `colors.onPrimary` from `theme/colors.ts`; surfaces from NativeWind `z-*` classes).
- WP-UI0 must land before N-6/N-8 compile (they import `ZIconTile` + `lib/datetime`); the Phase A gate calls this out.
- Four-state + error-before-empty + `SectionList` + keyboard-N/A (no text input on this screen) rules satisfied.
