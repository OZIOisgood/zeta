# Mobile Plan 5: Upload Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A signed-in user with the `assets:create` permission can pick one or more videos from the library, choose a group, give the upload a title, and the app uploads the files directly to Mux with visible progress, calls `POST /assets/{id}/complete`, and refreshes the Videos list. Interrupted/failed uploads survive an app restart as retryable entries.

**Architecture:** Three new pieces. (1) Contract: `POST /assets`, `POST /assets/{id}/complete`, `GET /groups` join the OpenAPI spec (shapes mirror `internal/assets/handler.go:46-62` and `internal/groups/handler.go:20-26`). (2) An upload manager (`src/upload/upload-store.ts`, vanilla Zustand + persist): jobs hold per-file state (`pending/uploading/done/failed` + progress 0..1); files upload sequentially via `expo-file-system` upload tasks (binary PUT to the Mux `upload_url`); when all files are done the job completes the asset through the shared `api` client and invalidates the `['assets']` query; queue metadata persists in AsyncStorage so interrupted jobs rehydrate as `failed` (retry re-PUTs the whole file — chunked resume is a documented follow-up). (3) UI: an `upload` route inside the auth gate (title/description form, group picker chips, picked-file list via `expo-image-picker`), an upload FAB on the Videos tab gated on the `assets:create` permission, and inline progress cards on the Videos list while jobs run.

**Tech Stack:** expo-image-picker, expo-file-system (upload tasks — check SDK 56 API: the class-based API is default, the documented `createUploadTask`/`uploadAsync` may live in `expo-file-system/legacy`; use what the installed package provides), @react-native-async-storage/async-storage + zustand/persist, existing TanStack Query/NativeWind/i18n infra.

**Parent spec:** `.agents/plans/20260611225227_mobile_app_react_native_expo_design.md`
**Predecessors:** Plans 1–4 on `feat/mobile-token-auth` (PR #15). Plan 5 continues on the SAME branch.

**Product terms:** UI copy says **video/videos**; API keeps `asset`. The web flow this mirrors: `POST /assets` → direct PUT to Mux per file → `POST /assets/{id}/complete` (README "Video Upload Flow").

**Conventions:** identical to Plans 2–4 (wsl.exe shell wrapper, UNC file access, RNTL 14 async render, tests NEVER under `src/app/`, per-task green gates `test`/`tsc`/`lint`, Conventional Commits, no `Co-Authored-By`).

---

## Backend source of truth (verified)

- `POST /assets` (RequireAuth + `assets:create` permission → 403; group membership checked → 403): body `{title, description, filenames[], group_id}` — title and group_id REQUIRED (400). Response `{asset_id, videos: [{id, upload_url, filename}]}`.
- `POST /assets/{id}/complete`: 400 invalid id, 200 `{status: "ok"}`.
- `GET /groups` (requires `groups:read`): array of `{id, name, owner_id, avatar (nullable), description, created_at, updated_at}`.
- Mux `upload_url`: accepts a single binary PUT of the file (resumable chunking optional, NOT in this plan).

## File Structure (end state)

```
docs/openapi.yaml                          + POST /assets, POST /assets/{id}/complete, GET /groups + schemas
mobile/src/api/schema.d.ts                 regenerated
mobile/src/api/query-client.ts             + exported queryClient singleton (factory stays for tests)
mobile/src/api/queries/groups.ts           useGroupsQuery + test
mobile/src/upload/upload-store.ts          upload manager (Zustand vanilla + persist)
mobile/src/upload/upload-store.test.ts
mobile/src/upload/file-transfer.ts         thin wrapper over expo-file-system upload task (mockable seam)
mobile/src/components/upload-progress-card.tsx  + test
mobile/src/app/upload.tsx                  upload form screen (auth-gated route)
mobile/src/app/(tabs)/index.tsx            + FAB (assets:create gated) + active-job progress section
mobile/src/__tests__/upload-screen.test.tsx
mobile/src/app/_layout.tsx                 + upload route in the signedIn guard
```

---

### Task 1: Contract — create/complete/groups endpoints

**Files:**
- Modify: `docs/openapi.yaml`, regenerate `mobile/src/api/schema.d.ts`

- [ ] **Step 1: Extend `docs/openapi.yaml`.** Add tag `groups`. Under `paths`:

```yaml
  /assets:
    post:
      tags: [assets]
      summary: Create an asset and Mux direct-upload URLs for its files
      operationId: createAsset
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateAssetRequest"
      responses:
        "200":
          description: Created asset with one upload URL per filename
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CreateAssetResponse"
        "400":
          description: Missing title or group_id, invalid body
        "401":
          description: Not authenticated
        "403":
          description: Missing assets:create permission or not a group member
  /assets/{id}/complete:
    post:
      tags: [assets]
      summary: Mark all uploads of an asset as finished
      operationId: completeAssetUpload
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Asset moved to pending review
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    enum: [ok]
                required: [status]
        "400":
          description: Invalid asset id
        "401":
          description: Not authenticated
  /groups:
    get:
      tags: [groups]
      summary: List groups visible to the current user
      operationId: listGroups
      responses:
        "200":
          description: Groups the user can see
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Group"
        "401":
          description: Not authenticated
        "403":
          description: Missing groups:read permission
```

(`GET /assets` with the `get:` operation already exists — ADD the `post:` operation to the SAME `/assets` path item; do not duplicate the path key.) Under `components.schemas`:

```yaml
    CreateAssetRequest:
      type: object
      properties:
        title:
          type: string
        description:
          type: string
        filenames:
          type: array
          items:
            type: string
        group_id:
          type: string
          format: uuid
      required: [title, description, filenames, group_id]
    CreateAssetVideo:
      type: object
      properties:
        id:
          type: string
        upload_url:
          type: string
          description: Mux direct-upload URL; PUT the file binary here
        filename:
          type: string
      required: [id, upload_url, filename]
    CreateAssetResponse:
      type: object
      properties:
        asset_id:
          type: string
        videos:
          type: array
          items:
            $ref: "#/components/schemas/CreateAssetVideo"
      required: [asset_id, videos]
    Group:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        owner_id:
          type: string
        avatar:
          type: [string, "null"]
          description: Base64-encoded group avatar
        description:
          type: string
        created_at:
          type: string
        updated_at:
          type: string
      required: [id, name, owner_id, avatar, description, created_at, updated_at]
```

(Go `Avatar *string json:"avatar"` serializes as null — hence the nullable type. `description` in CreateAssetRequest is always sent by clients (may be empty string) — keeping it required matches the web client's payload.)

- [ ] **Step 2: Lint, regenerate, verify, commit**

```bash
bash -ic "make api:openapi:lint"
cd mobile && pnpm run generate:api && pnpm run test && pnpm exec tsc --noEmit
git add docs/openapi.yaml mobile/src/api/schema.d.ts
git commit -m "feat(api): add asset creation and groups endpoints to the contract"
```

---

### Task 2: Groups query hook + queryClient singleton export

**Files:**
- Modify: `mobile/src/api/query-client.ts`
- Create: `mobile/src/api/queries/groups.ts`, `mobile/src/api/queries/groups.test.tsx`

- [ ] **Step 1: Export a singleton** from `query-client.ts` (keep the factory):

```ts
export const queryClient = createQueryClient();
```

Update `mobile/src/app/_layout.tsx` to import this singleton instead of creating its own (delete the local `const queryClient = createQueryClient()`).

- [ ] **Step 2: Failing test** `groups.test.tsx` (same pattern as assets.test.tsx: hoisted QueryClient with `gcTime: 0`, teardown via `clear()`):

```tsx
// mocks: expo-secure-store as usual
import { useGroupsQuery } from './groups';

const GROUP = {
  id: 'g1', name: 'Karate Club', owner_id: 'u2', avatar: null,
  description: '', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

test('useGroupsQuery returns the group list', async () => {
  const client = { GET: jest.fn(async () => ({ data: [GROUP], error: undefined })) };
  const { result } = await renderHook(() => useGroupsQuery(client as never), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([GROUP]);
});
```

(Adapt the boilerplate from `assets.test.tsx` — same wrapper/teardown/import structure.)

- [ ] **Step 3: Implement** `groups.ts` mirroring `assets.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import type { components } from '../schema';
import { api } from '../../auth/auth-store';

export type Group = components['schemas']['Group'];

type Fetcher = Pick<typeof api, 'GET'>;

export function useGroupsQuery(client: Fetcher = api) {
  return useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await client.GET('/groups');
      if (error || !data) throw new Error('Failed to load groups');
      return data;
    },
  });
}
```

- [ ] **Step 4: Verify + commit**

```bash
cd mobile && pnpm run test && pnpm exec tsc --noEmit && pnpm run lint
git add mobile/src/api/ mobile/src/app/_layout.tsx
git commit -m "feat(mobile): add groups query and shared query client singleton"
```

---

### Task 3: Upload manager store (the core)

**Files:**
- Create: `mobile/src/upload/file-transfer.ts`, `mobile/src/upload/upload-store.ts`, `mobile/src/upload/upload-store.test.ts`
- Install: expo-file-system (if not already a transitive dep — check `pnpm ls expo-file-system`; `pnpm exec expo install expo-file-system` if missing)

- [ ] **Step 1: The transfer seam** `file-transfer.ts` — isolates the expo-file-system specifics so the store is testable. Check the INSTALLED package first (`ls node_modules/expo-file-system/build`, read its types): SDK 56 ships the class-based API by default with the legacy API at `expo-file-system/legacy`. Use the legacy upload task (documented Mux path) unless the new API offers an equivalent with progress:

```ts
import * as FileSystem from 'expo-file-system/legacy';

export type TransferHandle = { start: () => Promise<{ status: number }>; cancel: () => Promise<void> };

/**
 * Uploads a local file to a Mux direct-upload URL as a binary PUT.
 * onProgress receives 0..1.
 */
export function createFileTransfer(
  localUri: string,
  uploadUrl: string,
  onProgress: (fraction: number) => void,
): TransferHandle {
  const task = FileSystem.createUploadTask(
    uploadUrl,
    localUri,
    {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    },
    (progress) => {
      const total = progress.totalBytesExpectedToSend || 1;
      onProgress(progress.totalBytesSent / total);
    },
  );
  return {
    start: async () => {
      const result = await task.uploadAsync();
      return { status: result?.status ?? 0 };
    },
    cancel: () => task.cancelAsync(),
  };
}
```

ADAPT names to the installed types (e.g. `FileSystemUploadType` enum location); behavior contract: binary PUT, progress 0..1, resolves with the HTTP status.

- [ ] **Step 2: Failing store tests** `upload-store.test.ts` — mock `./file-transfer` and the api client; cover these behaviors (write full tests; model the mock style on the existing stores):

1. `enqueue(createResponse, pickedFiles, title)` creates a job with one `pending` file per video and starts processing.
2. Files upload sequentially; progress callbacks update `files[i].progress`; HTTP 2xx → file `done`.
3. When ALL files are done: job → `completing`, `api.POST('/assets/{id}/complete', ...)` is called with the asset id, job → `done`, and `queryClient.invalidateQueries({ queryKey: ['assets'] })` fires (inject a mock queryClient).
4. A transfer resolving with status ≥400 (or throwing) marks the file `failed` and the job `failed`; `retryFile(jobId, videoId)` re-runs only that file and, on success, continues to completion.
5. `dismissJob(jobId)` removes `done`/`failed` jobs.

- [ ] **Step 3: Implement** `upload-store.ts` (vanilla Zustand; persistence comes in Task 5 — keep the store creation wrapped in a `createUploadStore(deps)` factory taking `{ transfer = createFileTransfer, client = api, queryClient = sharedQueryClient }` for testability, plus an exported singleton `uploadStore` and a `useUploads(selector)` hook like `useAuth`):

```ts
export type UploadFileState = {
  videoId: string;
  uploadUrl: string;
  localUri: string;
  filename: string;
  progress: number; // 0..1
  status: 'pending' | 'uploading' | 'done' | 'failed';
};

export type UploadJob = {
  id: string;        // asset id
  title: string;
  files: UploadFileState[];
  status: 'uploading' | 'completing' | 'done' | 'failed';
};
```

Processing rules: sequential per job (one file at a time, `for` loop with await), errors caught per file; `completeJob` POSTs `/assets/{id}/complete` with `{ params: { path: { id } } }`; on complete-failure the job is `failed` (retry re-attempts completion if all files are already done). NEVER log URLs or file paths with tokens (Mux upload URLs are capability URLs — do not log them).

- [ ] **Step 4: Verify + commit**

```bash
cd mobile && pnpm run test && pnpm exec tsc --noEmit && pnpm run lint
git add mobile/src/upload/ mobile/package.json mobile/pnpm-lock.yaml
git commit -m "feat(mobile): add upload manager with sequential mux transfers"
```

---

### Task 4: Upload UI — screen, FAB, progress cards

**Files:**
- Create: `mobile/src/app/upload.tsx`, `mobile/src/components/upload-progress-card.tsx`, `mobile/src/components/upload-progress-card.test.tsx`, `mobile/src/__tests__/upload-screen.test.tsx`
- Modify: `mobile/src/app/(tabs)/index.tsx` (FAB + active jobs section), `mobile/src/app/_layout.tsx` (route in signedIn guard)
- Install: `pnpm exec expo install expo-image-picker` (keep app.json plugin/permission entries it adds)

- [ ] **Step 1: Failing tests.**

`upload-progress-card.test.tsx`: renders title, per-file progress (e.g. "2/3"), failed state shows a retry button (testID `upload-retry`), done state shows a dismiss button.

`upload-screen.test.tsx` (mock expo-image-picker, expo-router, the groups query, the upload store, api.POST): submitting with title + group + 1 picked file calls `api.POST('/assets', ...)` with `{title, description, filenames, group_id}`, then `uploadStore.enqueue` with the response, then navigates back. Submit button disabled while title/group/files missing.

- [ ] **Step 2: Upload screen** `mobile/src/app/upload.tsx` — form with: title (`TextInput` styled with tokens — a full `z-text-input` port is NOT in scope; a styled TextInput with `accessibilityLabel` is fine), optional description, group picker (chips from `useGroupsQuery`, single-select, skeleton while loading), "Pick videos" button → `ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsMultipleSelection: true })`, picked-file list with names + remove, submit ZButton → `api.POST('/assets', { body: { title, description, filenames, group_id } })` → `uploadStore.enqueue(data, pickedFiles, title)` → `router.back()`. Errors: inline error text + ZButton retry semantics (no alerts). Permission denial from the picker: show the picker's own flow; if canceled, do nothing.

- [ ] **Step 3: FAB + progress on the Videos tab.** In `(tabs)/index.tsx`: a `Plus`-icon FAB (absolute bottom-right, `bg-z-primary`, accessibilityLabel "Upload video") shown only when `useAuth(s => s.user?.permissions ?? []).includes('assets:create')`; navigates to `/upload`. Above the list (also in empty state), render active/failed jobs from `useUploads` as `UploadProgressCard`s (progress bars via a `ZSkeleton`-style track + `bg-z-primary` fill width%, retry/dismiss actions wired to the store).

- [ ] **Step 4: Route registration** — `<Stack.Screen name="upload" />` inside the signedIn `Stack.Protected` block (presentation: `options={{ presentation: 'modal' }}` is nice-to-have; plain screen acceptable).

- [ ] **Step 5: Verify + commit**

```bash
cd mobile && pnpm run test && pnpm exec tsc --noEmit && pnpm run lint
pnpm exec expo export --platform web --output-dir /tmp/zeta-export-p5 && rm -rf /tmp/zeta-export-p5
git add mobile/
git commit -m "feat(mobile): add upload screen with progress on the videos tab"
```
Export route list must include `/upload`, no test routes.

---

### Task 5: Queue persistence across restarts

**Files:**
- Modify: `mobile/src/upload/upload-store.ts` (+ persist), `mobile/src/upload/upload-store.test.ts` (+ rehydration tests)
- Install: `pnpm exec expo install @react-native-async-storage/async-storage`

- [ ] **Step 1: Failing tests:** (a) after enqueue, the persisted snapshot (mock AsyncStorage, flush pending writes) contains the job metadata but NO transient fields; (b) rehydrating a snapshot containing an `uploading` file yields state `failed` for that file and `failed` for the job (interrupted upload → retryable); (c) `done` jobs older than the snapshot are dropped on rehydrate (don't resurrect finished noise).

- [ ] **Step 2: Implement** with `zustand/middleware` `persist` + `createJSONStorage(() => AsyncStorage)`: `partialize` to jobs only (strip function fields automatically — verify progress numbers persist, that's fine), `onRehydrateStorage` hook maps any `uploading`/`pending`/`completing` statuses to `failed` (file + job) and filters out `done` jobs. Mux upload URLs stay valid long enough for a retry (hours); the retry re-PUTs the whole file from `localUri` (note: the local picker URI may have been cleaned by the OS — a failed re-read marks the file `failed` with the existing error path; acceptable, documented).

- [ ] **Step 3: Verify + commit**

```bash
cd mobile && pnpm run test && pnpm exec tsc --noEmit && pnpm run lint
git add mobile/src/upload/ mobile/package.json mobile/pnpm-lock.yaml mobile/app.json
git commit -m "feat(mobile): persist the upload queue across restarts"
```

---

### Task 6: i18n + docs + final verification

**Files:**
- Modify: upload UI components (existing dashboard keys only — the dashboard HAS an `upload` section: `upload.retry`, `upload.uploading` were seen earlier; look up the full section and reuse whatever fits), `mobile/README.md` (upload section), root `README.md` (Mobile upload edge in the architecture diagram: `Mobile -->|Direct Upload| Mux`)

- [ ] **Step 1:** Key lookup in `mobile/src/i18n/locales/en.json` (`upload` section + `common.actions`); wire matches via `useTranslation`; list non-matches as dashboard follow-ups. Verify keys exist in de+fr too.
- [ ] **Step 2:** `mobile/README.md`: add an "Uploads" paragraph (direct-to-Mux PUT, sequential queue, persisted across restarts, retry re-uploads the whole file; chunked resume = follow-up).
- [ ] **Step 3:** Root README architecture diagram: add `Mobile -->|Direct Upload| Mux` next to the existing Mobile edges.
- [ ] **Step 4: Full battery:**

```bash
bash -ic "make mobile:lint && make mobile:typecheck && make mobile:test && make api:openapi:lint"
/usr/local/go/bin/go test ./... -count=1
cd mobile && pnpm exec expo export --platform web --output-dir /tmp/zeta-export-p5f && rm -rf /tmp/zeta-export-p5f
```

- [ ] **Step 5: Commit:** `git add mobile/ README.md && git commit -m "docs(mobile): document the upload flow"`

---

## Out of Scope (follow-ups)

- Chunked/resumable Mux uploads (Content-Range protocol) and iOS background-session uploads — the single biggest robustness upgrade, deliberately separate.
- In-app camera recording (`expo-camera`) — picker-only for v1.
- Upload from share-sheet intents.
- Reviews/comments on the detail screen (next feature plan).

## Verification Checklist (end of plan)

- [ ] All mobile gates green (≥45 tests), export includes `/upload`
- [ ] OpenAPI lint 0 errors, schema idempotent, Go suite green
- [ ] No Mux upload URLs or file paths in logs
- [ ] FAB hidden without `assets:create`; upload route still auth-gated
