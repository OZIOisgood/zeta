# Mobile Group Administration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan. Dispatch one subagent per task, in order. Each task is self-contained: it names the exact files, the failing test to write first, the command to run (with expected output), the minimal real implementation, and the commit. Steps use checkbox (`- [ ]`) syntax — check each off as you complete it. Do NOT batch tasks. Do NOT skip the "run it, expect FAIL" step.

> **Depends on:** WP-UI0 (`20260613233000_mobile_shared_ui_foundation.md`). The Danger-Zone delete card on the preferences screen is the shared `ZDangerZoneCard` primitive (ZCard + `ZIconTile(tone='danger', AlertTriangle)` + title/description + `ZButton(variant='danger')` wired to its own `ZConfirmDialog(tone='danger')`) — this plan does **not** hand-style a rose-bordered card or build a parallel delete confirm. Phase B (the screen tasks) therefore also gates on WP-UI0 landing, in addition to WP1. If WP-UI0 is not yet merged when Phase B starts, rebase onto it so `mobile/src/components/ui/z-danger-zone-card.tsx` is present before G5-T5.

**Goal:** Give experts/admins the three group-administration actions that exist on the web but are missing on mobile — **edit group preferences** (name/description/avatar), **delete the group**, and **remove a member** — surfaced through the existing mobile design system. This closes the read/author gap on the group-detail screen: today an expert can see members and leave, but cannot edit the group, delete it, or remove a student.

**Architecture:** Standard Package Shape "S" — the backend already exists and is wired (`internal/api/server.go:198-203`). Work is **contract-surfacing + mobile**, never new backend:
1. Surface the three existing Go handlers into `docs/openapi.yaml` matching the handlers byte-for-byte, then lint.
2. Regenerate the typed client (`pnpm --dir mobile run generate:api`).
3. Add injectable mutation hooks in `mobile/src/api/queries/groups.ts` mirroring the existing `useCreateGroupMutation` / `useLeaveGroupMutation` shape, with co-located tests.
4. Extend `mobile/src/components/member-row.tsx` with a permission-gated remove action (do NOT build a parallel member row), add a group-preferences screen (`group/[id]/preferences.tsx`) that reuses the WP1 create-group form layout, and wire the remove-member confirm + a Preferences entry point into the existing `group/[id].tsx`.
5. i18n: the keys already exist in the web JSON source and (verified) the synced mobile JSONs — confirm presence, no destructive sync needed.
6. Tests (jest-expo / RNTL) + emulator screenshots.

**Tech Stack:** Go (chi, sqlc) backend [unchanged]; OpenAPI 3.1 + `openapi-typescript` codegen; Expo/React Native + expo-router; `@tanstack/react-query` (injectable client = `api` default; hooks throw on `error || !data`); NativeWind `z-*` design system; i18next (Transloco-synced JSONs); jest-expo + `@testing-library/react-native` (`render()` is async; hook tests use `renderHook` + a fake client). Shell: wrap every command with `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && <cmd>"`.

---

## Backend reality (read-only — do NOT change)

Verified against the live handlers; the contract below must match these exactly:

- **`PUT /groups/{groupID}` → `groups.UpdateGroupPreferences`** (`internal/groups/handler.go:330-412`, route `server.go:198`). Perm `groups:preferences:edit` + membership check. Body `UpdateGroupRequest {name, description, avatar}` — **`name` required (400)**; `description` optional; `avatar` optional **base64 string** that, when empty, **keeps the existing avatar** (handler refetches and preserves it, `:382-385`). Returns **200** with the updated `Group` DTO (`toGroupResponse`, same shape as `createGroup`). Errors: 400 invalid body / missing name / bad group ID; 401; 403 (no perm or not a member); 404 group not found; 500.
- **`DELETE /groups/{groupID}` → `groups.DeleteGroup`** (`handler.go:414-461`, route `server.go:199`). Perm `groups:delete`. Deletes scoped to `OwnerID = caller` (`DeleteGroupParams{ID, OwnerID}`, `:439-442`) — a non-owner with the perm silently deletes nothing but still gets 204; the web only shows the button to the owner, so mobile gates the same way. Returns **204** no body. Errors: 400 invalid group ID; 401; 403; 500.
- **`DELETE /groups/{groupID}/users/{userID}` → `users.RemoveGroupUser`** (`internal/users/handler.go:206-324`, route `server.go:203`). Perm **`groups:user-list:delete`** (`permissions.GroupsUserListDelete`, `:228`). Refuses to remove the **group owner** (400, `:247-250`). Returns **204** no body (`:323`). Errors: 400 invalid group ID / missing user ID / target is owner; 401; 403; 404 group not found; 500. (Side effect: emails the removed user — not our concern.)

**Web parity reference** (the design source — "parity of information, not desktop layout"):
- `web/.../pages/group-preferences/group-preferences-page.component.ts` — a two-tab page (`ZTabs`: `General` + `Danger Zone`). General = name (required, `/\S/`) + avatar-input (optional on edit) + description; inline error banner; Save disabled until **dirty AND valid AND not-loading** (web `saveDisabled = invalid || !hasChanges || loading`); success toast `groups.updated`. Danger Zone = a rose-bordered card with a `groups:delete`-gated **Delete Group** button → `ZConfirmDialog` (`tone="danger"`), or the leave card for non-owners (leave already shipped on mobile), or `deleteUnavailable` copy when neither delete nor leave applies.
  - **Adaptive deviation (stated explicitly, per `mobile/AGENTS.md` "parity of information, not of layout"):** mobile does **not** reproduce the desktop two-tab `ZTabs` split. The preferences screen is a single vertical scroll — the edit form first, the Danger-Zone card (`ZDangerZoneCard`) below it. Tabs are a desktop affordance for a wide split-pane; on a phone a short flat stack is the established pattern (the form is short and the danger card is one action). This is a deliberate flat-stack deviation, not an omission: every element of both web tabs is present, just stacked rather than tabbed. (If a future screen grows enough sections to warrant it, revisit with the mobile `ZTabs` primitive.)
- `web/.../pages/group-details/group-details-page.component.ts` — each member row gets a `groups:user-list:delete`-gated trash `z-icon-button` (hidden for the current user, `:218`) → `ZConfirmDialog` (`groups.users.removeUser` / `groups.users.confirmRemove`) → success/error toast (`groups.users.removed` / `groups.users.removeFailed`). A `groups:preferences:edit || groups:membership:leave`-gated **Preferences** link sits in the group hero.

**Permissions** are WorkOS-baked JWT claims read on mobile via `useAuth((s) => s.user?.permissions)` (an array; `group/[id].tsx:123-131` is the live pattern — `permissions?.includes('groups:...')`). No Terraform/permission code changes.

---

## Constraints (state in every task, do not violate)

- **Single PR #15**, branch `feat/mobile-token-auth`. **Local commits per task; do NOT push.**
- **Shared working tree.** Phase A (contract + hooks) touches only `docs/openapi.yaml`, the generated `mobile/src/api/schema.d.ts`, and `mobile/src/api/queries/groups.ts` (+ its test) — collision-free, run now. **Phase B (screen-touching tasks) gate on the parallel WP1 session**: WP1 creates `mobile/src/app/group/create.tsx` and adds the FAB, and shares `group/[id].tsx`. **Do not start Phase B until the user signals WP1's session is done** (WP1 owns the create-group form this plan's preferences form mirrors; building on top of an unmerged form is rework).
- **No shared-DB migration** (no schema/query change — backend is untouched).
- **WSL tooling** (see memory: Worktree & make gotchas): if `make` cannot find Go tooling, call binaries directly. Codegen/lint/git are run by the executing engineer, not pre-run here.
- `asset == video` in the DB/API; say **"video"** in any new UI copy (none needed here — groups have their own nouns).

---

## File Structure (every file touched + its one responsibility)

| File | Created/Modified | Responsibility |
| --- | --- | --- |
| `docs/openapi.yaml` | Modified | Add `put: updateGroup` + `delete: deleteGroup` to the existing `/groups/{groupID}` path item; add a new `/groups/{groupID}/users/{userID}` path with `delete: removeGroupMember`; add the `UpdateGroupRequest` schema. |
| `mobile/src/api/schema.d.ts` | Modified (generated) | Regenerated typed client exposing the three new operations. Never hand-edit. |
| `mobile/src/api/queries/groups.ts` | Modified | Add `useUpdateGroupMutation`, `useDeleteGroupMutation`, `useRemoveGroupMemberMutation` (injectable client + invalidator), plus the `UpdateGroupInput` type. |
| `mobile/src/api/queries/groups.test.tsx` | Modified | Co-located hook tests for the three new mutations (args, return, invalidation, no-invalidate-on-error). |
| `mobile/src/components/member-row.tsx` | Modified | Add an optional, perm-gated trash `ZIconButton` that fires an `onRemove` callback. Backwards-compatible: no `onRemove` → no button. |
| `mobile/src/components/member-row.test.tsx` | Modified | Tests: remove button renders only when `onRemove` provided, fires the callback, carries the accessible label. |
| `mobile/src/app/group/[id]/preferences.tsx` | Created | Group edit/preferences screen: edit form (reuses WP1 create-group layout) + `ZDangerZoneCard` (WP-UI0) for owner-only delete, or the `deleteUnavailable` fallback copy when the user can neither delete nor leave. |
| `mobile/src/app/group/[id].tsx` | Modified | Add a `groups:preferences:edit || groups:membership:leave`-gated Preferences entry button in the hero, and the `groups:user-list:delete`-gated remove-member confirm flow passing `onRemove` into `MemberRow`. |

> **Route note:** the existing detail route is `mobile/src/app/group/[id].tsx`. Adding `mobile/src/app/group/[id]/preferences.tsx` makes expo-router treat `[id]` as **both** a leaf (`group/123`) and a directory (`group/123/preferences`). expo-router supports this (`[id].tsx` + `[id]/` coexist; the leaf wins for the bare path). Confirm during G5-T5 that `router.push('/group/{id}')` still lands on the detail screen and `/group/{id}/preferences` lands on the new one. If a collision surfaces, fall back to a flat `group/[id]-preferences.tsx`-style sibling — but try the nested form first (it matches the web URL `/groups/{id}/preferences`).

---

## Phase A — Contract + hooks (collision-free, execute now)

### G5-T1 — Contract: updateGroup + deleteGroup + removeGroupMember

**Files:** `docs/openapi.yaml` (Modified).

- [ ] Constraints reminder: single PR #15, branch `feat/mobile-token-auth`, local commit at the end, no push. This task is collision-free (contract only).
- [ ] Open `docs/openapi.yaml` and find the existing `/groups/{groupID}:` path item (currently `get: getGroup` only, ~line 261). Add `put` and `delete` operations to that **same** path item, immediately after the existing `get:` block. Use this exact YAML (2-space indent, sibling of `get:`):

```yaml
    put:
      tags: [groups]
      summary: Update group preferences (name, description, avatar)
      operationId: updateGroup
      parameters:
        - name: groupID
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/UpdateGroupRequest"
      responses:
        "200":
          description: The updated group
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Group"
        "400":
          description: Invalid group ID, invalid body, or missing name
        "401":
          description: Not authenticated
        "403":
          description: Missing groups:preferences:edit permission or caller is not a member
        "404":
          description: Group not found
        "500":
          description: Failed to update the group
    delete:
      tags: [groups]
      summary: Delete a group (owner only)
      operationId: deleteGroup
      parameters:
        - name: groupID
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "204":
          description: Group deleted
        "400":
          description: Invalid group ID
        "401":
          description: Not authenticated
        "403":
          description: Missing groups:delete permission
        "500":
          description: Failed to delete the group
```

- [ ] Add a new path item for member removal. Place it **after** the existing `/groups/{groupID}/experts:` block and **before** `/groups/{groupID}/invitations:` (keep the `/groups/{groupID}/...` paths grouped). Exact YAML:

```yaml
  /groups/{groupID}/users/{userID}:
    delete:
      tags: [groups]
      summary: Remove a member from a group
      operationId: removeGroupMember
      parameters:
        - name: groupID
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: userID
          in: path
          required: true
          schema:
            type: string
      responses:
        "204":
          description: Member removed
        "400":
          description: Invalid group ID, missing user ID, or target is the group owner
        "401":
          description: Not authenticated
        "403":
          description: Missing groups:user-list:delete permission
        "404":
          description: Group not found
        "500":
          description: Failed to remove the member
```

- [ ] Add the `UpdateGroupRequest` schema under `components.schemas`, immediately after the existing `CreateGroupRequest` block. Note `avatar` is **optional** here (omit/empty keeps the existing avatar — matches `handler.go:382-385`), so `required` lists only `name`:

```yaml
    UpdateGroupRequest:
      type: object
      properties:
        name:
          type: string
        description:
          type: string
        avatar:
          type: string
          description: Base64-encoded image data (max 300KB); omit or empty to keep the current avatar
      required: [name]
```

- [ ] Run the linter, expect **0 errors**:

```
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && make api:openapi:lint"
```

Expected: lint passes with no errors. (If `make` can't find the spectral/redocly binary, invoke the lint binary directly per the WSL tooling note.)

- [ ] Commit:

```
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add docs/openapi.yaml && git commit -m 'feat(groups): surface updateGroup/deleteGroup/removeGroupMember in mobile contract'"
```

### G5-T2 — Regenerate the typed client

**Files:** `mobile/src/api/schema.d.ts` (Modified, generated).

- [ ] Constraints reminder: single PR #15, branch `feat/mobile-token-auth`, local commit, no push. Generated-only — never hand-edit the output.
- [ ] Regenerate:

```
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile run generate:api"
```

- [ ] Verify the three operations and the new schema now exist (expect each grep to print at least one match):

```
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && grep -n 'updateGroup\|deleteGroup\|removeGroupMember\|UpdateGroupRequest' mobile/src/api/schema.d.ts"
```

Expected: `put: operations[\"updateGroup\"]` and `delete: operations[\"deleteGroup\"]` under the `/groups/{groupID}` path key; a `/groups/{groupID}/users/{userID}` path key with `delete: operations[\"removeGroupMember\"]`; and `UpdateGroupRequest` under `components[\"schemas\"]`.

- [ ] Run codegen a second time and confirm `git diff --quiet mobile/src/api/schema.d.ts` (idempotent — the generator is deterministic):

```
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile run generate:api && git diff --stat mobile/src/api/schema.d.ts"
```

Expected: no further diff after the second run.

- [ ] Commit:

```
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add mobile/src/api/schema.d.ts && git commit -m 'chore(mobile): regenerate api client for group admin endpoints'"
```

### G5-T3 — Mutation hooks: updateGroup, deleteGroup, removeGroupMember

**Files:** `mobile/src/api/queries/groups.ts` (Modified), `mobile/src/api/queries/groups.test.tsx` (Modified).

- [ ] Constraints reminder: single PR #15, branch `feat/mobile-token-auth`, local commit, no push. Collision-free (hook file + its test only).
- [ ] **Write the failing tests first.** Append these to `mobile/src/api/queries/groups.test.tsx`, and add the three new hooks to the existing import on line 11 (`useUpdateGroupMutation, useDeleteGroupMutation, useRemoveGroupMemberMutation`). These mirror the existing `useCreateGroupMutation` / `useLeaveGroupMutation` tests exactly (same `wrapper`, same `GROUP`/`invalidated` helpers already in the file):

```tsx
// ── useUpdateGroupMutation ────────────────────────────────────────────────────

test('useUpdateGroupMutation puts the body, returns the group, invalidates [groups]', async () => {
  const PUT = jest.fn(async () => ({ data: GROUP, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (args: unknown) => void invalidated.push(args)) };
  const { result } = await renderHook(
    () => useUpdateGroupMutation('g1', { PUT } as never, qc as never),
    { wrapper },
  );
  const input = { name: 'Karate Club', description: 'Dojo', avatar: 'data:image/png;base64,AAA' };
  const group = await result.current.mutateAsync(input);
  expect(PUT).toHaveBeenCalledWith('/groups/{groupID}', {
    params: { path: { groupID: 'g1' } },
    body: input,
  });
  expect(group).toEqual(GROUP);
  expect(invalidated).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ queryKey: ['groups'] }),
      expect.objectContaining({ queryKey: ['groups', 'g1'] }),
    ]),
  );
});

test('useUpdateGroupMutation does not invalidate on error', async () => {
  const PUT = jest.fn(async () => ({ data: undefined, error: { message: 'boom' } }));
  const qc = { invalidateQueries: jest.fn() };
  const { result } = await renderHook(
    () => useUpdateGroupMutation('g1', { PUT } as never, qc as never),
    { wrapper },
  );
  await expect(result.current.mutateAsync({ name: 'x' })).rejects.toThrow();
  expect(qc.invalidateQueries).not.toHaveBeenCalled();
});

// ── useDeleteGroupMutation ────────────────────────────────────────────────────

test('useDeleteGroupMutation deletes by id (204) and invalidates [groups]', async () => {
  const DELETE = jest.fn(async () => ({ data: undefined, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (args: unknown) => void invalidated.push(args)) };
  const { result } = await renderHook(
    () => useDeleteGroupMutation('g1', { DELETE } as never, qc as never),
    { wrapper },
  );
  await result.current.mutateAsync();
  expect(DELETE).toHaveBeenCalledWith('/groups/{groupID}', {
    params: { path: { groupID: 'g1' } },
  });
  expect(invalidated).toEqual(
    expect.arrayContaining([expect.objectContaining({ queryKey: ['groups'] })]),
  );
});

test('useDeleteGroupMutation throws when the api returns an error', async () => {
  const DELETE = jest.fn(async () => ({ data: undefined, error: { message: 'boom' } }));
  const qc = { invalidateQueries: jest.fn() };
  const { result } = await renderHook(
    () => useDeleteGroupMutation('g1', { DELETE } as never, qc as never),
    { wrapper },
  );
  await expect(result.current.mutateAsync()).rejects.toThrow();
  expect(qc.invalidateQueries).not.toHaveBeenCalled();
});

// ── useRemoveGroupMemberMutation ──────────────────────────────────────────────

test('useRemoveGroupMemberMutation deletes the member (204) and invalidates member lists', async () => {
  const DELETE = jest.fn(async () => ({ data: undefined, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (args: unknown) => void invalidated.push(args)) };
  const { result } = await renderHook(
    () => useRemoveGroupMemberMutation('g1', { DELETE } as never, qc as never),
    { wrapper },
  );
  await result.current.mutateAsync({ userId: 'u9' });
  expect(DELETE).toHaveBeenCalledWith('/groups/{groupID}/users/{userID}', {
    params: { path: { groupID: 'g1', userID: 'u9' } },
  });
  expect(invalidated).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ queryKey: ['groups', 'g1', 'students'] }),
      expect.objectContaining({ queryKey: ['groups', 'g1', 'experts'] }),
    ]),
  );
});

test('useRemoveGroupMemberMutation throws when the api returns an error', async () => {
  const DELETE = jest.fn(async () => ({ data: undefined, error: { message: 'forbidden' } }));
  const qc = { invalidateQueries: jest.fn() };
  const { result } = await renderHook(
    () => useRemoveGroupMemberMutation('g1', { DELETE } as never, qc as never),
    { wrapper },
  );
  await expect(result.current.mutateAsync({ userId: 'u9' })).rejects.toThrow();
  expect(qc.invalidateQueries).not.toHaveBeenCalled();
});
```

- [ ] Run the test, **expect FAIL** (hooks don't exist yet):

```
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/api/queries/groups.test.tsx"
```

Expected output: TypeScript/runtime errors like `useUpdateGroupMutation is not a function` (or a TS compile error on the import) — the six new tests fail; the existing ones still pass.

- [ ] **Minimal implementation.** In `mobile/src/api/queries/groups.ts`: add a `Putter` type alias next to the existing ones (after line 12, `type Deleter = ...`), export an `UpdateGroupInput` type next to `CreateGroupInput` (line 8), and append the three hooks after `useLeaveGroupMutation`. Real code:

Add the type alias (after `type Deleter = Pick<typeof api, 'DELETE'>;`):

```ts
type Putter = Pick<typeof api, 'PUT'>;
```

Add the input type (after `export type CreateGroupInput = components['schemas']['CreateGroupRequest'];`):

```ts
export type UpdateGroupInput = components['schemas']['UpdateGroupRequest'];
```

Append the hooks (end of file):

```ts
export function useUpdateGroupMutation(
  id: string,
  client: Putter = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async (input: UpdateGroupInput) => {
      const { data, error } = await (client as typeof api).PUT('/groups/{groupID}', {
        params: { path: { groupID: id } },
        body: input,
      });
      if (error || !data) throw new Error('Failed to update group');
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['groups'] });
      await qc.invalidateQueries({ queryKey: ['groups', id] });
    },
  });
}

export function useDeleteGroupMutation(
  id: string,
  client: Deleter = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async () => {
      const { error } = await (client as typeof api).DELETE('/groups/{groupID}', {
        params: { path: { groupID: id } },
      });
      // 204 returns no body — treat error === undefined as success
      if (error !== undefined) throw new Error('Failed to delete group');
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useRemoveGroupMemberMutation(
  id: string,
  client: Deleter = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async (input: { userId: string }) => {
      const { error } = await (client as typeof api).DELETE('/groups/{groupID}/users/{userID}', {
        params: { path: { groupID: id, userID: input.userId } },
      });
      // 204 returns no body — treat error === undefined as success
      if (error !== undefined) throw new Error('Failed to remove group member');
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['groups', id, 'students'] });
      await qc.invalidateQueries({ queryKey: ['groups', id, 'experts'] });
    },
  });
}
```

- [ ] Run the test, **expect PASS** (all groups tests green):

```
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/api/queries/groups.test.tsx"
```

Expected: all tests pass (the original suite + the six new ones). Do NOT run the full mobile suite while WP1 has in-flight screen files.

- [ ] Commit:

```
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add mobile/src/api/queries/groups.ts mobile/src/api/queries/groups.test.tsx && git commit -m 'feat(mobile): add update/delete group + remove-member mutation hooks'"
```

---

## Phase B — Screens (⚠️ gate on the parallel WP1 session before starting)

> **Do not start any task below until the user confirms WP1's session is done AND WP-UI0 has landed.** WP1 creates `mobile/src/app/group/create.tsx` (the create-group form whose layout G5-T5 mirrors) and shares `group/[id].tsx`. WP-UI0 creates `mobile/src/components/ui/z-danger-zone-card.tsx` (the shared `ZDangerZoneCard`) and `mobile/src/components/ui/z-icon-tile.tsx`, which G5-T5 consumes for the delete card. Building the preferences form before the create form lands — or hand-rolling the danger card before `ZDangerZoneCard` exists — is rework. When both are done, `git pull`/rebase so the create form and the shared primitives are present.

### G5-T4 — Extend MemberRow with a perm-gated remove action

**Files:** `mobile/src/components/member-row.tsx` (Modified), `mobile/src/components/member-row.test.tsx` (Modified).

- [ ] Constraints reminder: single PR #15, branch `feat/mobile-token-auth`, local commit, no push. EXTEND the existing `member-row.tsx` — do NOT build a new member row.
- [ ] **Write the failing tests first.** Append to `mobile/src/components/member-row.test.tsx` (the file already does `beforeAll(() => initI18n('en'))` and imports `render, screen` + `fireEvent` is available from RNTL):

```tsx
import { fireEvent } from '@testing-library/react-native';

test('shows no remove button when onRemove is omitted', async () => {
  await render(<MemberRow member={MEMBER} />);
  expect(screen.queryByTestId('member-remove')).toBeNull();
});

test('renders the remove button and fires onRemove when provided', async () => {
  const onRemove = jest.fn();
  await render(<MemberRow member={MEMBER} onRemove={onRemove} />);
  const button = screen.getByTestId('member-remove');
  expect(button).toBeOnTheScreen();
  // i18n: groups.users.removeUser → "Remove User"
  expect(screen.getByLabelText('Remove User')).toBeOnTheScreen();
  fireEvent.press(button);
  expect(onRemove).toHaveBeenCalledTimes(1);
});
```

- [ ] Run the test, **expect FAIL** (`onRemove` prop and the button don't exist):

```
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/components/member-row.test.tsx"
```

Expected: the two new tests fail (no `member-remove` testID; `onRemove` not a recognized prop); the four existing tests pass.

- [ ] **Minimal implementation.** Edit `mobile/src/components/member-row.tsx`: add an optional `onRemove` prop and a trailing trash `ZIconButton` rendered only when `onRemove` is set. The button's accessible label uses the existing `groups.users.removeUser` key (already in en/de/fr). Full updated file:

```tsx
import { Text, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { GroupUser } from '../api/queries/groups';
import { ZAvatar } from './ui/z-avatar';
import { ZBadge } from './ui/z-badge';
import { ZIconButton } from './ui/z-icon-button';
import { colors } from '../theme/colors';

function initials(member: GroupUser): string {
  const first = member.first_name.charAt(0).toUpperCase();
  const last = member.last_name.charAt(0).toUpperCase();
  return `${first}${last}`;
}

const ROLE_KEYS: Record<string, string> = {
  admin: 'groups.roles.admin',
  expert: 'groups.roles.expert',
  student: 'groups.roles.student',
};

export function MemberRow({
  member,
  onRemove,
}: {
  member: GroupUser;
  /** When provided, renders a perm-gated remove action that calls back with no args. */
  onRemove?: () => void;
}) {
  const { t } = useTranslation();
  const fullName = `${member.first_name} ${member.last_name}`.trim();
  const roleKey = ROLE_KEYS[member.role];
  const roleLabel = roleKey ? t(roleKey) : member.role;
  return (
    <View className="flex-row items-center gap-3 py-2">
      <ZAvatar
        image={member.avatar}
        fallback={initials(member)}
        size={44}
        shape="circle"
        alt={fullName}
        testID={member.avatar ? undefined : 'member-initials'}
      />
      <View className="flex-1">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="text-sm font-semibold text-z-text">{fullName}</Text>
          <ZBadge label={roleLabel} tone="primary" />
        </View>
        <Text className="text-sm text-z-muted">{member.email}</Text>
      </View>
      {onRemove ? (
        <ZIconButton
          testID="member-remove"
          label={t('groups.users.removeUser')}
          variant="ghost"
          size="sm"
          onPress={onRemove}
        >
          <Trash2 color={colors.danger} size={18} />
        </ZIconButton>
      ) : null}
    </View>
  );
}
```

- [ ] Run the test, **expect PASS**:

```
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/components/member-row.test.tsx"
```

Expected: all six tests pass.

- [ ] Commit:

```
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add mobile/src/components/member-row.tsx mobile/src/components/member-row.test.tsx && git commit -m 'feat(mobile): add perm-gated remove action to MemberRow'"
```

### G5-T5 — Group preferences screen (edit form + Danger-Zone delete)

**Files:** `mobile/src/app/group/[id]/preferences.tsx` (Created).

- [ ] Constraints reminder: single PR #15, branch `feat/mobile-token-auth`, local commit, no push. **This is a screen task — confirm WP1 is done and rebased first.** The edit form reuses the WP1 create-group form layout (`group/create.tsx`) verbatim for consistency — open it and mirror its field order/spacing.
- [ ] **Test placement rule:** never put test files under `src/app/` (expo-router turns them into routes — `mobile/AGENTS.md`). This screen's render test lives at `mobile/src/__tests__/group-preferences.test.tsx`. Write it first.

Create `mobile/src/__tests__/group-preferences.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'g1' }),
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
}));

const updateMutate = jest.fn(async () => ({}));
const deleteMutate = jest.fn(async () => undefined);
jest.mock('../api/queries/groups', () => ({
  useGroupQuery: () => ({
    data: {
      id: 'g1', name: 'Karate Club', owner_id: 'u1', avatar: null,
      description: 'Dojo', created_at: '', updated_at: '',
    },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useUpdateGroupMutation: () => ({ mutateAsync: updateMutate, isPending: false }),
  useDeleteGroupMutation: () => ({ mutateAsync: deleteMutate, isPending: false }),
}));

jest.mock('../auth/auth-store', () => ({
  useAuth: (sel: (s: unknown) => unknown) =>
    sel({ user: { id: 'u1', permissions: ['groups:preferences:edit', 'groups:delete'] } }),
}));

import { initI18n } from '../i18n';
import GroupPreferencesScreen from '../app/group/[id]/preferences';

beforeAll(() => initI18n('en'));
beforeEach(() => {
  updateMutate.mockClear();
  deleteMutate.mockClear();
  mockReplace.mockClear();
});

test('saves edited preferences via updateGroup', async () => {
  await render(<GroupPreferencesScreen />);
  fireEvent.changeText(screen.getByTestId('group-name-input'), 'Karate Club 2');
  fireEvent.press(screen.getByTestId('group-save'));
  await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
  expect(updateMutate).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'Karate Club 2' }),
  );
});

test('owner with groups:delete sees the delete button and confirms deletion', async () => {
  await render(<GroupPreferencesScreen />);
  // ZDangerZoneCard (WP-UI0): testID="group-delete" → action button has
  // testID "group-delete", its internal confirm button "group-delete-confirm".
  fireEvent.press(screen.getByTestId('group-delete'));
  fireEvent.press(screen.getByTestId('group-delete-confirm'));
  await waitFor(() => expect(deleteMutate).toHaveBeenCalledTimes(1));
  expect(mockReplace).toHaveBeenCalledWith('/(tabs)/groups');
});

test('save is disabled until the form is dirty (and re-disabled after save)', async () => {
  await render(<GroupPreferencesScreen />);
  // Pristine: name valid but unchanged → disabled, so pressing does nothing.
  fireEvent.press(screen.getByTestId('group-save'));
  expect(updateMutate).not.toHaveBeenCalled();
  // Make it dirty → enabled.
  fireEvent.changeText(screen.getByTestId('group-name-input'), 'Karate Club 2');
  fireEvent.press(screen.getByTestId('group-save'));
  await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
});
```

> The delete-card testIDs follow the `ZDangerZoneCard` (WP-UI0) convention: the card's `testID` prop (`"group-delete"`) is the action button's testID, and its internally-owned `ZConfirmDialog(tone='danger')` confirm button is `"{testID}-confirm"` (`"group-delete-confirm"`). Confirm this convention against `mobile/src/components/ui/z-danger-zone-card.tsx` when WP-UI0 has landed; if WP-UI0 instead exposes the confirm only by label, target the confirm button by its translated label `screen.getByText('Delete Group')`. The load-bearing assertions are that `deleteMutate` fired and `router.replace('/(tabs)/groups')` was called. The disabled-until-dirty test asserts the MUST-FIX: a pristine (valid but unchanged) form does not save; a dirty+valid form does.

- [ ] Run the test, **expect FAIL** (screen file doesn't exist):

```
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/__tests__/group-preferences.test.tsx"
```

Expected: module-not-found for `../app/group/[id]/preferences`.

- [ ] **Minimal implementation.** Create `mobile/src/app/group/[id]/preferences.tsx`. It reuses the WP1 create-group layout (header card → name `ZTextInput` → avatar `ZAvatarInput` → description `ZTextarea`), wrapped in `ZScreen` + `ZKeyboardAvoidingView` + a `ScrollView` with `keyboardShouldPersistTaps='handled'`. Save → `useUpdateGroupMutation` (**inline error banner using the standard danger tokens** `border-z-danger`/`text-z-danger` — never raw rose-* palette — on failure, success `showToast`). The **Save button is disabled until the form is BOTH dirty AND valid AND not saving** (mirrors web `saveDisabled = invalid || !hasChanges || loading`): track the hydrated baseline and compare. Below the form, the shared **`ZDangerZoneCard`** (WP-UI0) for the `groups:delete`-gated owner-only delete — it composes ZCard + `ZIconTile(tone='danger', AlertTriangle)` + title/description + `ZButton(variant='danger')` wired to its own internal `ZConfirmDialog(tone='danger')`, so the screen passes the copy + `onAction`/`loading`/`confirm*` props and does **not** hand-style a rose tile or manage a separate confirm-dialog state. When the user can neither delete (not owner) nor leave, render the `groups.deleteUnavailable` fallback copy. All copy uses keys verified present in the synced mobile JSONs (`groups.deleteUnavailable` confirmed in en/de/fr at plan time). Real code:

```tsx
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  useGroupQuery,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
} from '../../../api/queries/groups';
import { useAuth } from '../../../auth/auth-store';
import { initialsFromName } from '../../../lib/avatar';
import { ZScreen } from '../../../components/ui/z-screen';
import { ZSkeleton } from '../../../components/ui/z-skeleton';
import { ZQueryError } from '../../../components/ui/z-query-error';
import { ZKeyboardAvoidingView } from '../../../components/ui/z-keyboard-avoiding-view';
import { ZCard } from '../../../components/ui/z-card';
import { ZFieldLabel } from '../../../components/ui/z-field-label';
import { ZFieldError } from '../../../components/ui/z-field-error';
import { ZTextInput } from '../../../components/ui/z-text-input';
import { ZTextarea } from '../../../components/ui/z-textarea';
import { ZAvatarInput } from '../../../components/ui/z-avatar-input';
import { ZButton } from '../../../components/ui/z-button';
import { ZDangerZoneCard } from '../../../components/ui/z-danger-zone-card';
import { showToast } from '../../../components/ui/z-toast';

export default function GroupPreferencesScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const groupId = id ?? '';

  const { data, isPending, isError, refetch } = useGroupQuery(groupId);

  const permissions = useAuth((s) => s.user?.permissions ?? null);
  const userId = useAuth((s) => s.user?.id ?? null);
  const canEdit = permissions?.includes('groups:preferences:edit') ?? false;
  const canDelete =
    (permissions?.includes('groups:delete') ?? false) &&
    data !== undefined &&
    data.owner_id === userId;
  // Non-owners who can leave see the leave card on the detail screen; the
  // deleteUnavailable copy is shown only when neither delete nor leave applies.
  const canLeave = permissions?.includes('groups:membership:leave') ?? false;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  // Hydrated baseline used to compute hasChanges (dirty tracking).
  const [baseline, setBaseline] = useState<{
    name: string;
    description: string;
    avatar: string | undefined;
  } | null>(null);
  const [nameTouched, setNameTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Hydrate the form + baseline once the group loads.
  if (data && baseline === null) {
    const initial = {
      name: data.name,
      description: data.description ?? '',
      avatar: data.avatar ?? undefined,
    };
    setName(initial.name);
    setDescription(initial.description);
    setAvatar(initial.avatar);
    setBaseline(initial);
  }

  const { mutateAsync: updateGroup, isPending: saving } = useUpdateGroupMutation(groupId);
  const { mutateAsync: deleteGroup, isPending: deleting } = useDeleteGroupMutation(groupId);

  const nameInvalid = nameTouched && name.trim() === '';
  // Mirrors the web `saveDisabled = invalid || !hasChanges || loading`.
  const invalid = name.trim() === '';
  const hasChanges =
    baseline !== null &&
    (name !== baseline.name ||
      description !== baseline.description ||
      avatar !== baseline.avatar);
  const saveDisabled = invalid || !hasChanges || saving;

  async function handleSave() {
    setNameTouched(true);
    if (saveDisabled) return;
    setFormError(null);
    try {
      await updateGroup({
        name: name.trim(),
        description: description.trim(),
        // Only send avatar when the user picked a new one; empty keeps the existing image.
        avatar: avatar && avatar !== (data?.avatar ?? undefined) ? avatar : undefined,
      });
      // Move the baseline forward so the form is no longer "dirty" after a save.
      setBaseline({ name, description, avatar });
      showToast(t('toast.successTitle'), t('groups.updated'), 'success');
    } catch {
      setFormError(t('groups.updateFailed'));
    }
  }

  async function handleConfirmDelete() {
    try {
      await deleteGroup();
      showToast(t('toast.successTitle'), t('groups.deleted'), 'success');
      router.replace('/(tabs)/groups');
    } catch {
      showToast(t('toast.errorTitle'), t('groups.deleteFailed'), 'error');
    }
  }

  if (isPending) {
    return (
      <ZScreen className="gap-4 p-4">
        <ZSkeleton testID="group-preferences-skeleton" className="h-20 w-full" />
        <ZSkeleton className="h-11 w-full" />
        <ZSkeleton className="h-20 w-full" />
      </ZScreen>
    );
  }

  if (isError || !data) {
    return (
      <ZScreen className="items-center justify-center px-8">
        <ZQueryError
          title={t('groups.phase4.detailFailed')}
          onRetry={() => void refetch()}
        />
      </ZScreen>
    );
  }

  return (
    <ZScreen edges={['bottom']}>
      <ZKeyboardAvoidingView>
        <ScrollView
          className="flex-1 bg-z-bg"
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Form header card (form-screen header per the design contract) */}
          <View className="p-4">
            <Text className="text-2xl font-semibold text-z-text">{t('groups.preferences')}</Text>
            <Text className="mt-1 text-sm leading-6 text-z-muted">
              {t('groups.phase4.preferencesSummary')}
            </Text>
          </View>

          {canEdit ? (
            <View className="px-4">
              <ZCard>
                <View className="gap-5">
                  <View className="gap-2">
                    <ZFieldLabel label={t('groups.groupName')} />
                    <ZTextInput
                      testID="group-name-input"
                      accessibilityLabel={t('groups.groupName')}
                      value={name}
                      onChangeText={setName}
                      onBlur={() => setNameTouched(true)}
                      placeholder={t('groups.namePlaceholder')}
                      invalid={nameInvalid}
                    />
                    {nameInvalid ? <ZFieldError message={t('groups.groupNameRequired')} /> : null}
                  </View>

                  <View className="gap-2">
                    <ZFieldLabel label={t('groups.avatarTitle')} />
                    <ZAvatarInput
                      value={avatar}
                      onChange={setAvatar}
                      fallback={initialsFromName(name)}
                      alt={name}
                      label={t('avatar.selectImage')}
                      disabled={saving}
                    />
                  </View>

                  <View className="gap-2">
                    <ZFieldLabel label={t('common.fields.description')} />
                    <ZTextarea
                      accessibilityLabel={t('common.fields.description')}
                      value={description}
                      onChangeText={setDescription}
                      placeholder={t('groups.descriptionPlaceholder')}
                    />
                  </View>

                  {/* Form-save failure → inline banner using the standard danger
                      tokens (NEVER raw rose-* palette). */}
                  {formError ? (
                    <View className="rounded-md border border-z-danger bg-z-surface p-3">
                      <Text className="text-sm text-z-danger">{formError}</Text>
                    </View>
                  ) : null}

                  <ZButton
                    testID="group-save"
                    label={t('common.actions.save')}
                    onPress={() => void handleSave()}
                    disabled={saveDisabled}
                  />
                </View>
              </ZCard>
            </View>
          ) : null}

          {/* Danger zone — owner-only delete via the shared ZDangerZoneCard
              (WP-UI0). It owns its ZIconTile(tone='danger') + ZButton(variant=
              'danger') + ZConfirmDialog(tone='danger') internally. */}
          {canDelete ? (
            <View className="px-4 pt-6">
              <ZDangerZoneCard
                testID="group-delete"
                title={t('groups.deleteThisGroup')}
                description={t('groups.deleteSummary')}
                actionLabel={t('groups.deleteGroup')}
                onAction={() => void handleConfirmDelete()}
                loading={deleting}
                confirmTitle={t('groups.deleteGroup')}
                confirmMessage={t('groups.deleteConfirm')}
                confirmLabel={t('groups.deleteGroup')}
              />
            </View>
          ) : !canLeave ? (
            // Neither owner (can delete) nor a member who can leave: explain why.
            <View className="px-4 pt-6">
              <Text className="text-sm leading-6 text-z-muted">
                {t('groups.deleteUnavailable')}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </ZKeyboardAvoidingView>
    </ZScreen>
  );
}
```

> **Verify before relying on these APIs (don't guess — read the source):** open `mobile/src/app/group/create.tsx` (WP1) and align the field order/spacing/header exactly. Confirm `ZFieldLabel` takes `label` and `ZFieldError` takes `message` (`mobile/src/components/ui/z-field-label.tsx` / `z-field-error.tsx`). Confirm **`ZDangerZoneCard` (WP-UI0, `mobile/src/components/ui/z-danger-zone-card.tsx`)** exposes exactly `{ title, description, actionLabel, onAction, loading?, disabled?, confirmTitle, confirmMessage, confirmLabel, testID? }` and owns its `ZConfirmDialog(tone='danger')` internally — if the landed WP-UI0 prop names differ, adjust this screen's call to match (do **not** fork or re-style the card). Confirm `ZTextInput` accepts an `onBlur` prop — the current primitive (`z-text-input.tsx`) does **not** expose `onBlur`; if it's absent, either (a) add `onBlur?: TextInputProps['onBlur']` passthrough to `ZTextInput` in a tiny primitive edit (it already forwards `onSubmitEditing`, so the pattern exists) or (b) drop `onBlur` and set `nameTouched` on Save only. Pick (b) if you want zero primitive churn — the test sets the name then presses Save, which sets `nameTouched`. Confirm `initialsFromName` is exported from `mobile/src/lib/avatar.ts` (it is — used by `group/[id].tsx:14`). Confirm the groups tab route string for `router.replace` matches the real path in `mobile/src/app/(tabs)/` (the test asserts `/(tabs)/groups`; adjust both together if the real route differs).

- [ ] Run the test, **expect PASS**:

```
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/__tests__/group-preferences.test.tsx"
```

Expected: both tests pass.

- [ ] Typecheck the new screen (catches prop mismatches against the real primitives):

```
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile run typecheck"
```

Expected: 0 errors. If `ZTextInput` rejects `onBlur`, apply fallback (b) above and re-run.

- [ ] Commit:

```
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add mobile/src/app/group/[id]/preferences.tsx mobile/src/__tests__/group-preferences.test.tsx && git commit -m 'feat(mobile): add group preferences edit + delete screen'"
```

### G5-T6 — Wire Preferences entry + remove-member into the detail screen

**Files:** `mobile/src/app/group/[id].tsx` (Modified — ⚠️ shared with WP1; rebase first).

- [ ] Constraints reminder: single PR #15, branch `feat/mobile-token-auth`, local commit, no push. **Shared file — confirm WP1 done + rebased, re-read the current `group/[id].tsx` before editing** (WP1 may have added the invite section in the same hero/section region).
- [ ] **Add a render test** at `mobile/src/__tests__/group-detail-admin.test.tsx` (NOT under `src/app/`). It asserts: (a) a `groups:user-list:delete` holder sees a remove button per non-self member and confirming fires `removeGroupMember`; (b) a `groups:preferences:edit` holder sees a Preferences entry that navigates to `/group/g1/preferences`. Write it first:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'g1' }),
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

const removeMutate = jest.fn(async () => undefined);
const STUDENT = {
  id: 'u2', email: 'bob@example.com', first_name: 'Bob',
  last_name: 'Jones', avatar: undefined, role: 'student',
};
jest.mock('../api/queries/groups', () => ({
  useGroupQuery: () => ({
    data: { id: 'g1', name: 'Karate Club', owner_id: 'u1', avatar: null, description: 'Dojo', created_at: '', updated_at: '' },
    isPending: false, isError: false, refetch: jest.fn(),
  }),
  useGroupStudentsQuery: () => ({ data: [STUDENT], isPending: false, isError: false, refetch: jest.fn() }),
  useGroupExpertsQuery: () => ({ data: [], isPending: false, isError: false, refetch: jest.fn() }),
  useLeaveGroupMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useRemoveGroupMemberMutation: () => ({ mutateAsync: removeMutate, isPending: false }),
}));

jest.mock('../auth/auth-store', () => ({
  useAuth: (sel: (s: unknown) => unknown) =>
    sel({
      user: {
        id: 'u1',
        permissions: ['groups:user-list:read', 'groups:user-list:delete', 'groups:preferences:edit'],
      },
    }),
}));

import { initI18n } from '../i18n';
import GroupDetailScreen from '../app/group/[id]';

beforeAll(() => initI18n('en'));
beforeEach(() => {
  removeMutate.mockClear();
  mockPush.mockClear();
});

test('remove-member confirm fires removeGroupMember for the target user', async () => {
  await render(<GroupDetailScreen />);
  fireEvent.press(screen.getByTestId('member-remove'));
  fireEvent.press(screen.getByTestId('member-remove-dialog-confirm'));
  await waitFor(() => expect(removeMutate).toHaveBeenCalledWith({ userId: 'u2' }));
});

test('preferences entry navigates to the preferences route', async () => {
  await render(<GroupDetailScreen />);
  fireEvent.press(screen.getByTestId('group-preferences-entry'));
  expect(mockPush).toHaveBeenCalledWith('/group/g1/preferences');
});
```

> As in G5-T5, `member-remove-dialog-confirm` is shorthand for the confirm button in the `ZConfirmDialog`; if no per-button testID exists, press by the confirm label `screen.getByText('Remove')` (`common.actions.remove`). The load-bearing assertion is `removeMutate` called with `{ userId: 'u2' }`.

- [ ] Run the test, **expect FAIL** (no Preferences entry, `MemberRow` not wired with `onRemove`, `useRemoveGroupMemberMutation` not imported):

```
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/__tests__/group-detail-admin.test.tsx"
```

Expected: failures on missing `group-preferences-entry` / `member-remove` testIDs.

- [ ] **Minimal implementation.** Edit `mobile/src/app/group/[id].tsx`:
  - Add to the imports: `useRemoveGroupMemberMutation` from `../../api/queries/groups`, and `Settings` from `lucide-react-native`.
  - Add permission flags after the existing `canLeave` (~line 131):

```tsx
  const canRemoveMembers = permissions?.includes('groups:user-list:delete') ?? false;
  const canOpenPreferences =
    (permissions?.includes('groups:preferences:edit') ?? false) ||
    (permissions?.includes('groups:membership:leave') ?? false);
```

  - Add remove-mutation + dialog state near the existing `useLeaveGroupMutation` / `showLeaveConfirm` (~line 146-148):

```tsx
  const { mutateAsync: removeMember } = useRemoveGroupMemberMutation(id ?? '');
  const [memberToRemove, setMemberToRemove] = useState<GroupUser | null>(null);

  async function handleConfirmRemove() {
    const target = memberToRemove;
    setMemberToRemove(null);
    if (!target) return;
    try {
      await removeMember({ userId: target.id });
      showToast(
        t('toast.successTitle'),
        t('groups.users.removed', { name: `${target.first_name} ${target.last_name}`.trim() }),
        'success',
      );
    } catch {
      showToast(t('toast.errorTitle'), t('groups.users.removeFailed'), 'error');
    }
  }
```

  - In the hero header (`group/[id].tsx:200-215`, the `flex-row ... p-4` block), add a Preferences `ZIconButton` after the title `View`, gated on `canOpenPreferences`:

```tsx
          {canOpenPreferences && (
            <ZIconButton
              testID="group-preferences-entry"
              label={t('groups.preferences')}
              onPress={() => router.push(`/group/${data.id}/preferences`)}
            >
              <Settings color={colors.text} size={22} />
            </ZIconButton>
          )}
```

  - In `MemberSection`, thread the remove affordance down. Change the `MemberSection` props to accept `onRemoveMember?: (m: GroupUser) => void` and `canRemove: boolean`, and pass `onRemove` to `MemberRow` only when allowed and the member is not the current user:

```tsx
            renderItem={({ item }) => (
              <MemberRow
                member={item}
                onRemove={
                  canRemove && item.id !== currentUserId
                    ? () => onRemoveMember?.(item)
                    : undefined
                }
              />
            )}
```

  (Add `canRemove`, `onRemoveMember`, and `currentUserId` to the `MemberSection` prop type + the two call sites; pass `canRemove={canRemoveMembers}`, `onRemoveMember={setMemberToRemove}`, `currentUserId={userId}`. `userId` already exists at `:124`.)

  - Render one shared remove-confirm `ZConfirmDialog` near the leave dialog (`:267-278`), driven by `memberToRemove`:

```tsx
          <ZConfirmDialog
            testID="member-remove-dialog"
            visible={memberToRemove !== null}
            tone="danger"
            title={t('groups.users.removeUser')}
            description={t('groups.users.confirmRemove', {
              name: memberToRemove
                ? `${memberToRemove.first_name} ${memberToRemove.last_name}`.trim()
                : '',
            })}
            confirmLabel={t('common.actions.remove')}
            cancelLabel={t('common.actions.cancel')}
            onConfirm={() => void handleConfirmRemove()}
            onCancel={() => setMemberToRemove(null)}
          />
```

- [ ] Run the test, **expect PASS**:

```
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/__tests__/group-detail-admin.test.tsx"
```

Expected: both tests pass.

- [ ] Commit:

```
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add mobile/src/app/group/[id].tsx mobile/src/__tests__/group-detail-admin.test.tsx && git commit -m 'feat(mobile): wire preferences entry + remove-member into group detail'"
```

### G5-T7 — i18n verification (no destructive sync)

**Files:** none changed if keys already present (verified at plan time).

- [ ] Constraints reminder: single PR #15, branch `feat/mobile-token-auth`. The web JSON source already defines every key this package uses, and the synced mobile JSONs already carry them (verified at plan time): `groups.preferences`, `groups.phase4.preferencesSummary`, `groups.groupName`, `groups.groupNameRequired`, `groups.namePlaceholder`, `groups.descriptionPlaceholder`, `groups.avatarTitle`, `groups.updated`, `groups.updateFailed`, `groups.deleteThisGroup`, `groups.deleteSummary`, `groups.deleteGroup`, `groups.deleteConfirm`, `groups.deleted`, `groups.deleteFailed`, `groups.deleteUnavailable`, `groups.users.removeUser`, `groups.users.confirmRemove`, `groups.users.removed`, `groups.users.removeFailed`, `common.fields.description`, `common.actions.{save,cancel,remove}`, `avatar.selectImage`, `toast.{successTitle,errorTitle}`. (`groups.deleteUnavailable` confirmed present in en/de/fr — `mobile/src/i18n/locales/{en,de,fr}.json` `groups.deleteUnavailable`.)
- [ ] Confirm the keys resolve in all three locales (expect each to print a non-empty value, no `undefined`):

```
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && for L in en de fr; do node -e \"const j=require('./mobile/src/i18n/locales/$L.json'); const g=j.groups; console.log('$L', g.preferences, '|', g.updateFailed, '|', g.deleted, '|', g.deleteUnavailable, '|', g.users.removeUser, '|', g.users.removed);\"; done"
```

- [ ] **Only if a key is missing** in any locale: add it to the **web JSON source** (`web/dashboard-next/public/i18n/{en,de,fr}.json`) first, then run `pnpm --dir mobile run sync:i18n`. ⚠️ `sync:i18n` is destructive — it drops mobile-only keys (e.g. `sessions.call.sessionFallback`); re-add them by hand afterward (see memory: i18n sync drift). Do **not** edit the mobile JSONs by hand except to restore mobile-only keys after a sync.
- [ ] No commit unless a sync ran. If it did:

```
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add mobile/src/i18n/locales web/dashboard-next/public/i18n && git commit -m 'chore(i18n): sync group admin strings'"
```

### G5-T8 — Full mobile gates + emulator screenshots

**Files:** none (verification only).

- [ ] Constraints reminder: single PR #15, branch `feat/mobile-token-auth`. Run only after WP1 is merged into the branch so the suite isn't fighting in-flight files.
- [ ] Run the mobile gates, all green:

```
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && make mobile:lint && make mobile:typecheck && make mobile:test"
```

Expected: lint 0 problems; typecheck 0 errors; jest all suites pass.
- [ ] Emulator screenshots required in the PR body (per `mobile/AGENTS.md` + Review Guidelines — see `zeta-emulator-test-setup` memory for the Expo Go 56 + adb-reverse setup): (1) group preferences screen with the edit form, (2) the Danger-Zone delete card + its confirm dialog, (3) the group-detail member list showing the per-member remove button, (4) the remove-member confirm dialog. Attach to PR #15.
- [ ] No commit (verification only).

---

## Verification

- **Phase A:** `make api:openapi:lint` 0 errors; `schema.d.ts` regenerated + idempotent (second codegen → no diff); `groups.test.tsx` green (6 new tests). Go suite unaffected (no Go change). Adversarial review: contract responses/permissions match `groups/handler.go` (`updateGroup` 200, `deleteGroup` 204, both gated) and `users/handler.go` (`removeGroupMember` 204, owner-protected, `groups:user-list:delete`).
- **Phase B:** all mobile gates green (`make mobile:lint`/`typecheck`/`test`); `member-row.test.tsx`, `group-preferences.test.tsx`, `group-detail-admin.test.tsx` pass; emulator screenshots of the four surfaces in the PR body.

## Out of scope / follow-ups

- Group **create** + **invite** (WP1 / the create+invite slice) — owned by separate plans; do not duplicate.
- A dedicated mobile **`groups:user-list:delete` for experts vs. students** distinction — the web removes from either list via the same endpoint; mobile mirrors that (gate on the one perm). No new perm.
- **Leave** flow — already shipped on mobile (`group/[id].tsx`); this plan only adds owner-delete and member-remove alongside it.

---

## UI Parity & Component Reuse

Header treatment per the design contract: the **preferences screen is a form screen → header card** (title + summary text, no FAB — it is reached from the detail hero, not a primary create). The **group-detail screen is a detail screen → entity hero card** (unchanged from WP-prior); the new **Preferences** action is a hero `ZIconButton` (secondary/config action), and remove-member is a per-row destructive `ZIconButton` → `ZConfirmDialog`. No new FAB (no primary-create action in this package).

| Screen element | Reuses (existing primitive/domain component + path) | New? |
| --- | --- | --- |
| Preferences screen root | `ZScreen` — `mobile/src/components/ui/z-screen.tsx` | reuse |
| Keyboard handling | `ZKeyboardAvoidingView` — `mobile/src/components/ui/z-keyboard-avoiding-view.tsx` + `keyboardShouldPersistTaps='handled'` | reuse |
| Form container card | `ZCard` — `mobile/src/components/ui/z-card.tsx` | reuse |
| Field labels | `ZFieldLabel` — `mobile/src/components/ui/z-field-label.tsx` | reuse |
| Name input + validation error | `ZTextInput` + `ZFieldError` — `mobile/src/components/ui/z-text-input.tsx`, `z-field-error.tsx` (same layout as the WP1 create-group form) | reuse |
| Group avatar picker | `ZAvatarInput` — `mobile/src/components/ui/z-avatar-input.tsx` | reuse |
| Description input | `ZTextarea` — `mobile/src/components/ui/z-textarea.tsx` | reuse |
| Save error banner | inline banner: `View` with **standard danger tokens** `border-z-danger bg-z-surface` + `text-z-danger` (the established form-save inline-error pattern; NO raw rose-* palette) | reuse pattern |
| Save success feedback | `showToast` — `mobile/src/components/ui/z-toast.tsx` | reuse |
| Save button (disabled until dirty+valid+not-saving) | `ZButton` — `mobile/src/components/ui/z-button.tsx` (`disabled={saveDisabled}`, mirrors web `invalid \|\| !hasChanges \|\| loading`) | reuse |
| Loading state | `ZSkeleton` — `mobile/src/components/ui/z-skeleton.tsx` | reuse |
| Load-error state (+retry, before empty) | `ZQueryError` — `mobile/src/components/ui/z-query-error.tsx` | reuse |
| Danger-Zone delete card (+ its confirm) | **`ZDangerZoneCard` — `mobile/src/components/ui/z-danger-zone-card.tsx` (WP-UI0)** — composes `ZCard` + `ZIconTile(tone='danger', AlertTriangle)` + title/description + `ZButton(variant='danger')` wired to an internal `ZConfirmDialog(tone='danger')`. The screen passes copy + `onAction`/`loading`/`confirm*`; no hand-styled rose tile, no separate confirm state. | reuse (WP-UI0) |
| Delete-unavailable fallback (neither delete nor leave) | plain `Text text-z-muted` rendering `groups.deleteUnavailable` | reuse pattern |
| Detail hero Preferences entry | `ZIconButton` (lucide `Settings`) — `mobile/src/components/ui/z-icon-button.tsx` | reuse |
| Member list rows | `MemberRow` — `mobile/src/components/member-row.tsx` — **EXTENDED** with an optional `onRemove` prop rendering a perm-gated trash `ZIconButton` (lucide `Trash2`). Counterpart of the web detail-page per-row remove `z-icon-button`. **Not SHARED** (mobile-only domain component; no other package consumes it). | **extend** |
| Remove-member confirmation | `ZConfirmDialog tone="danger"` — `mobile/src/components/ui/z-confirm-dialog.tsx` | reuse |
| Remove success/error feedback | `showToast` — `mobile/src/components/ui/z-toast.tsx` | reuse |
| Member-list pending/error/empty/data states | existing `MemberSection` in `group/[id].tsx` (`ZSkeleton` / `ZEmptyState`+retry / `ZEmptyState` / `FlatList`) — unchanged | reuse |

**REUSE-OR-JUSTIFY result:** this plan introduces no genuinely new component of its own. The Danger-Zone delete card is the shared **`ZDangerZoneCard`** owned by **WP-UI0** (`20260613233000_mobile_shared_ui_foundation.md`) — consumed here, not built here; that is why Phase B gates on WP-UI0 as well as WP1. The only component change in this plan is **extending** `MemberRow` (adding an optional `onRemove`), which is mandated by the package brief and is backwards-compatible (omitting `onRemove` reproduces the current render exactly). No new shared `z-*` primitive is created in this plan; no SHARED flag needed.

---

## Self-Review

**Spec coverage (every brief requirement maps to a task):**
- Surface `PUT /groups/{id}` (updateGroup) → **G5-T1** (contract) + **G5-T2** (codegen) + **G5-T3** (`useUpdateGroupMutation`) + **G5-T5** (edit form).
- Surface `DELETE /groups/{id}` (deleteGroup) → **G5-T1** + **G5-T2** + **G5-T3** (`useDeleteGroupMutation`) + **G5-T5** (Danger-Zone delete).
- Surface `DELETE /groups/{id}/users/{userId}` (removeGroupMember) → **G5-T1** + **G5-T2** + **G5-T3** (`useRemoveGroupMemberMutation`) + **G5-T4** (MemberRow extend) + **G5-T6** (detail wiring).
- Hooks in `mobile/src/api/queries/groups.ts` → **G5-T3** (mirrors `useCreateGroupMutation`/`useLeaveGroupMutation`: injectable client default `api`, throw on `error || !data` for the 200, `error !== undefined` for the 204s, correct invalidation).
- Group edit/preferences screen → **G5-T5** (reuses the WP1 create-group form layout: name/avatar/description, same primitives; Save disabled until dirty+valid+not-saving per web `saveDisabled`; Danger-Zone delete via the shared `ZDangerZoneCard` from WP-UI0; `groups.deleteUnavailable` fallback when neither delete nor leave applies).
- Remove-member action → **G5-T4** (extend `MemberRow`, not a new row) + **G5-T6** (perm gate + confirm + toast).
- "Runs AFTER WP1 (shares `group/[id].tsx`)" → encoded as the **Phase B gate** and restated in G5-T5/G5-T6.

**Placeholder scan:** no "TBD", "add validation", "handle edge cases", "tests for the above", or "similar to Task N". Every test and implementation is real, runnable code. Every referenced primitive/type is defined here or in a named dependency: `useUpdateGroupMutation`/`useDeleteGroupMutation`/`useRemoveGroupMemberMutation`/`UpdateGroupInput`/`Putter` defined in G5-T3; `UpdateGroupRequest` schema defined in G5-T1; `MemberRow` `onRemove` defined in G5-T4; the preferences screen defined in G5-T5; the detail wiring in G5-T6. The Danger-Zone card is the shared **`ZDangerZoneCard`** owned by **WP-UI0** (`20260613233000_mobile_shared_ui_foundation.md`), consumed by exact name/props (`title`/`description`/`actionLabel`/`onAction`/`loading`/`confirmTitle`/`confirmMessage`/`confirmLabel`/`testID`) — Phase B gates on it landing. i18n keys are not invented — all verified present in the source (G5-T7), including `groups.deleteUnavailable` (en/de/fr), with a fallback path if any were missing.

**Type/name consistency:** path strings match the regenerated schema keys exactly (`'/groups/{groupID}'`, `'/groups/{groupID}/users/{userID}'`, params `{ groupID, userID }` — note the contract uses `userID` in the path param name, matching `chi.URLParam(r, "userID")`). Query-key invalidations match the existing query keys in `groups.ts` (`['groups']`, `['groups', id]`, `['groups', id, 'students']`, `['groups', id, 'experts']`). Permission strings match the web/handler exactly (`groups:preferences:edit`, `groups:delete`, `groups:user-list:delete`; the `deleteUnavailable` fallback gate reads `groups:membership:leave`). The 204 hooks use `error !== undefined` (the established `useLeaveGroupMutation`/`useDeclineInvitationMutation` convention), the 200 hook uses `error || !data` (the `useCreateGroupMutation` convention). The Save button's `disabled` is `saveDisabled = invalid || !hasChanges || saving`, matching the web component byte-for-byte (dirty tracked against a hydrated baseline that advances on a successful save). Three explicit "verify-don't-guess" notes are flagged: the `ZDangerZoneCard` (WP-UI0) prop names/testID convention, a primitive prop that may not exist (`ZTextInput.onBlur`), and the groups-tab route string (`router.replace('/(tabs)/groups')`), each with a concrete fallback.

**Open risks the executor must resolve (not placeholders — real decisions gated on reading current code):**
1. expo-router `[id].tsx` leaf + `[id]/preferences.tsx` directory coexistence — verify routing in G5-T5; flat-sibling fallback documented.
2. Confirm-dialog testIDs — the delete card's confirm lives **inside** `ZDangerZoneCard` (WP-UI0); the test targets `"group-delete-confirm"` per the assumed `{testID}`/`{testID}-confirm` convention, falling back to the confirm label if WP-UI0 differs. The remove-member `ZConfirmDialog` in G5-T6 lacks per-button testIDs — that test targets the confirm by label. Load-bearing assertions are the mutation calls, not the testIDs.
3. WP1 + WP-UI0 merge order — Phase B must rebase onto the merged create-group form (WP1) **and** the shared `ZDangerZoneCard`/`ZIconTile` (WP-UI0) before editing the shared `group/[id].tsx`, mirroring `create.tsx`'s layout, and consuming `ZDangerZoneCard`. If `ZDangerZoneCard`'s landed prop names differ from those used here, adjust the call site to match — do not fork or re-style the card.
