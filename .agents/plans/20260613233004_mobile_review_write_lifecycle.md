# Mobile Reviewer Write-Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan. Steps use checkbox (- [ ]) syntax. Each task is one action; do them in order. Write the failing test first (REAL code), run it and SEE it fail, write the minimal implementation, run it and SEE it pass, then commit. Do not batch tasks. Do not invent code outside the snippets here.

**Goal:** Give a reviewer (expert) on mobile the same write-lifecycle over a video's comment thread that the web `video-details` page already has: **edit a comment**, **delete a comment** (confirmed), **AI-enhance** comment text while composing/editing, and **finalize the video** ("mark reviewed") with the unreviewed-parts guard. The read + create-comment surface already shipped (`mobile/src/app/asset/[id].tsx`, `reviews.ts`, `ReviewItem`, `ReviewComposer`). This slice back-fills the four mutating actions that were deferred.

**Architecture (Standard Package Shape "S" — the backend ALREADY EXISTS):**
1. Surface the three already-implemented backend endpoints into `docs/openapi.yaml` exactly matching the Go handlers, lint.
2. `pnpm --dir mobile run generate:api` to regenerate `mobile/src/api/schema.d.ts`.
3. Add injectable mutation hooks in `mobile/src/api/queries/reviews.ts` (update/delete/enhance) and `mobile/src/api/queries/assets.ts` (finalize), mirroring the existing `useCreateReviewMutation` shape and co-located test style.
4. Extend the existing domain components — `ReviewItem` (edit/delete affordances + inline edit form + collapse) and `ReviewComposer` (AI-enhance button) — and wire them in `asset/[id].tsx` (finalize action, delete `ZConfirmDialog`, finalize `ZConfirmDialog` with the unreviewed-parts guard). NO new comment components.
5. i18n: most keys already exist in the synced mobile locales, but two fixes are needed — add `videos.confirmDeleteCommentTitle` (missing) AND add i18next-compatible `videos.reply_one`/`videos.reply_other` plural keys (the existing flat `videos.reply.one`/`videos.reply.other` resolve under web Transloco but NOT under mobile i18next). Add all to the web JSON source (en/de/fr) then `pnpm --dir mobile run sync:i18n` (⚠️ destructive — re-add mobile-only keys).
6. Tests (jest-expo/RNTL: `render()` is async; hook tests use `renderHook` + a fake client) + emulator screenshots.

**Tech Stack:** Expo Router v56 / React Native, NativeWind (Zeta tokens), TanStack Query, openapi-fetch typed client, i18next (synced Transloco JSONs), jest-expo + @testing-library/react-native. Backend: Go + chi (no change — read-only reference).

**Backend reference (verified — do NOT modify, only mirror):**
- `PUT /assets/videos/{id}/reviews/{reviewId}` → `reviews.Handler.UpdateReview` (`internal/reviews/handler.go:354`). Body `UpdateReviewRequest {content}` (required). Perm `reviews:edit`. Author-only (403 on another user's review). 403 if the asset is `completed`. 404 if not found/not visible. Returns `200` `{id, content, created_at}`. Route mounted at `r.Route("/assets/videos", reviewsHandler.RegisterRoutes)` (`internal/api/server.go:190`); `RegisterRoutes` registers `r.Put("/{id}/reviews/{reviewId}", h.UpdateReview)` (`handler.go:41`).
- `DELETE /assets/videos/{id}/reviews/{reviewId}` → `reviews.Handler.DeleteReview` (`handler.go:458`, route `handler.go:42`). Perm `reviews:delete`. Author-only. 403 if `completed`. Returns `204` (no body).
- `POST /reviews/enhance` → `reviews.Handler.EnhanceText` (`handler.go:582`, route `server.go:191-193`). Body `EnhanceTextRequest {text}` (required). Perm `reviews:edit`. Returns `200` `EnhanceTextResponse {enhanced_text}`.
- `POST /assets/{id}/finalize` → `assets.Handler.FinalizeAsset` (`internal/assets/handler.go:781`, route `handler.go:69`). Perm `assets:finalize`. 404 if not visible. **400 if any video part has zero reviews** ("Cannot mark video as reviewed: all video parts must have at least one review"). Returns `200` `{status: "completed"}`.

**Web design reference (parity gate — verified):** `web/dashboard-next/src/app/pages/video-details/video-details-page.component.ts` and `web/dashboard-next/src/app/core/http/assets-api.service.ts` (methods `updateReview`, `deleteReview`, `enhanceReviewText`, `finalizeAsset`). Web behaviour mirrored below per element. Web permission gates: edit `reviews:edit && !isFinalized()`; delete `reviews:delete && !isFinalized()`; finalize `assets:finalize && !isFinalized()` (`video-details-page.component.ts:724-738`).

**Depends on:** WP-UI0 (`20260613233000_mobile_shared_ui_foundation.md`). This slice consumes the shared `datetime` helper from that foundation: the comment meta-row timestamp renders via `formatRelativeTime(iso, t)` from `mobile/src/lib/datetime.ts` — `review-item.tsx`'s local `formatRelativeTime` is removed by WP-UI0 and MUST NOT be re-introduced here. If WP-UI0 has not landed when T7 runs, land its `datetime.ts` extraction first (it is a pure move of `review-item.tsx`'s existing formatter plus a `t` argument); do not fork a second copy.

**Constraints (state these in every commit/PR):**
- Single PR **#15**, branch **`feat/mobile-token-auth`**. Local commits per task. **Do NOT push.**
- Shared working tree: the screen-touching task (T7) gates on the parallel session — do not start T7 until the user signals their session is done. Phases T1–T6 (contract + hooks + component-internal edits behind props) are collision-free.
- No shared-DB migration (no Go/SQL change in this slice).
- WSL tooling: wrap commands as `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && <cmd>"`.

---

## FILE STRUCTURE

| File | Created/Modified | Responsibility |
| --- | --- | --- |
| `docs/openapi.yaml` | Modified | Add `put`+`delete` to the existing `/assets/videos/{id}/reviews/{reviewId}` path item; add `/assets/{id}/finalize` (post) and `/reviews/enhance` (post) path items; add `UpdateReviewRequest`, `EnhanceTextRequest`, `EnhanceTextResponse`, `FinalizeAssetResponse` schemas. |
| `mobile/src/api/schema.d.ts` | Modified (generated) | Regenerated by `generate:api`; exposes the four new operations + schemas. Never hand-edited. |
| `mobile/src/api/queries/reviews.ts` | Modified | Add `useUpdateReviewMutation`, `useDeleteReviewMutation`, `useEnhanceReviewTextMutation` (injectable client + qc, mirror `useCreateReviewMutation`). |
| `mobile/src/api/queries/reviews.test.tsx` | Modified | Co-located tests for the three new review hooks (POST/PUT/DELETE args, invalidation, error throws). |
| `mobile/src/api/queries/assets.ts` | Modified | Add `useFinalizeAssetMutation` (injectable client + qc; invalidates `['assets', id]` + `['assets']`). |
| `mobile/src/api/queries/assets.test.tsx` | Modified | Co-located tests for `useFinalizeAssetMutation`. |
| `mobile/src/components/review-item.tsx` | Modified | Add edit/delete affordances (`ZIconButton`s, permission-gated via new props), an inline edit form (`ZTextarea` + enhance + save/cancel), and a replies-collapse toggle. NO new file. |
| `mobile/src/components/review-composer.tsx` | Modified | Add an AI-enhance (`Sparkles`) action that calls a new `onEnhance` prop and swaps the textarea content; loading + disabled handling. NO new file. |
| `mobile/src/app/asset/[id].tsx` | Modified | Wire update/delete/enhance into `ReviewsSection`; add the delete `ZConfirmDialog`; add a finalize ("mark reviewed") action in the metadata card with the finalize `ZConfirmDialog` + unreviewed-parts info dialog. |
| `web/dashboard-next/public/i18n/{en,de,fr}.json` | Modified | Add `videos.confirmDeleteCommentTitle` and the i18next-compatible plural siblings `videos.reply_one`/`videos.reply_other` (keep the existing flat `reply.one`/`reply.other` for web Transloco) so `sync:i18n` propagates them to mobile. |
| `mobile/src/i18n/locales/{en,de,fr}.json` | Modified (synced) | Refreshed by `sync:i18n`; gains `videos.confirmDeleteCommentTitle` + `videos.reply_one`/`videos.reply_other`. Re-add any mobile-only keys dropped by the destructive sync. |

**i18n keys used (already present in `mobile/src/i18n/locales/{en,de,fr}.json` — verified):** `videos.editComment`, `videos.deleteComment`, `videos.confirmDeleteComment`, `videos.enhanceText`, `videos.enhancing`, `videos.textEnhanced`, `videos.textEnhanceFailed`, `videos.markReviewed`, `videos.markVideoReviewed`, `videos.confirmMarkReviewed`, `videos.cannotMarkReviewed`, `videos.cannotMarkReviewedTitle`, `videos.reviewUpdateFailed`, `videos.commentDeleteFailed`, `videos.markReviewedFailed`, `videos.commentPlaceholder`, `videos.unknownAuthor`, `common.actions.{edit,delete,cancel,save,done,retry,back}`, `toast.successTitle`, `toast.errorTitle`.

**Missing/broken keys — fixed in T6:**
- `videos.confirmDeleteCommentTitle` (title for the delete `ZConfirmDialog`) is **absent** — added in T6.
- ⚠️ The replies-collapse plural keys do **not** work on mobile. The JSONs store flat dotted keys `"reply.one"` / `"reply.other"` inside the `videos` object. These resolve under web Transloco but **NOT** under mobile i18next: with i18next's default `keySeparator: '.'`, `t('videos.reply.one')` traverses `videos → reply → one`, but `videos.reply` is the string `"Reply"`, so the lookup fails and returns the literal key. The i18next plural convention is the `_one`/`_other` **suffix** on a base key, called as `t('videos.reply', { count })`. T6 adds `videos.reply_one` / `videos.reply_other` to the web source so the sync propagates working keys; the collapse toggle (T7c) calls `t('videos.reply', { count: replies.length })`.

---

## TASKS

### T1 — Contract: PUT + DELETE review on the `{reviewId}` path item

**Files:** `docs/openapi.yaml`

- [ ] In `docs/openapi.yaml`, the path item `/assets/videos/{id}/reviews` ends at line ~528 (after its `post`). Immediately after that path item (before `/auth/logout:`), add a new sibling path item for the single-review routes. Insert:

```yaml
  /assets/videos/{id}/reviews/{reviewId}:
    put:
      tags: [assets]
      summary: Edit a review on a video
      operationId: updateVideoReview
      parameters:
        - name: id
          in: path
          required: true
          description: video id
          schema:
            type: string
            format: uuid
        - name: reviewId
          in: path
          required: true
          description: review id
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/UpdateReviewRequest"
      responses:
        "200":
          description: Review updated
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/UpdateReviewResponse"
        "400":
          description: Invalid id, invalid body, or missing content
        "401":
          description: Not authenticated
        "403":
          description: Missing reviews:edit permission, not the author, or video is part of a completed asset
        "404":
          description: Review not found or video not visible
    delete:
      tags: [assets]
      summary: Delete a review on a video
      operationId: deleteVideoReview
      parameters:
        - name: id
          in: path
          required: true
          description: video id
          schema:
            type: string
            format: uuid
        - name: reviewId
          in: path
          required: true
          description: review id
          schema:
            type: string
            format: uuid
      responses:
        "204":
          description: Review deleted
        "400":
          description: Invalid id
        "401":
          description: Not authenticated
        "403":
          description: Missing reviews:delete permission, not the author, or video is part of a completed asset
        "404":
          description: Review not found or video not visible
```

- [ ] In `components.schemas`, immediately after the `CreateReviewRequest` schema (ends ~line 1259), add:

```yaml
    UpdateReviewRequest:
      type: object
      properties:
        content:
          type: string
      required: [content]
    UpdateReviewResponse:
      type: object
      properties:
        id:
          type: string
        content:
          type: string
        created_at:
          type: string
          format: date-time
      required: [id, content, created_at]
```

> ⚠️ **Why a dedicated response schema, not `$ref: Review`.** The Go `UpdateReview` handler (`internal/reviews/handler.go:451-455`) encodes exactly `{id, content, created_at}` — unlike `CreateReview` (`handler.go:308-327`) it does NOT echo back `author`, `timestamp_seconds`, or `parent_id`. Mapping the 200 to `Review` would over-promise fields the handler never sends. `UpdateReviewResponse` mirrors the handler byte-for-byte; the UI (T7c `handleEdit`) only relies on `review.id` + the new `content` already in hand, so the slim shape is sufficient.

- [ ] Run the lint:

```bash
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && make api:openapi:lint"
```

Expect `0` errors. If `make` cannot find tooling, run the underlying linter directly per the worktree gotchas memory.

- [ ] Commit:

```bash
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add docs/openapi.yaml && git commit -m 'feat(reviews): surface PUT/DELETE review to mobile contract (PR #15)'"
```

### T2 — Contract: enhance + finalize endpoints

**Files:** `docs/openapi.yaml`

- [ ] Add the `/reviews/enhance` path item. Place it next to the review paths (e.g. directly after the `/assets/videos/{id}/reviews/{reviewId}` item from T1):

```yaml
  /reviews/enhance:
    post:
      tags: [assets]
      summary: Rewrite review text with the AI enhancer
      operationId: enhanceReviewText
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/EnhanceTextRequest"
      responses:
        "200":
          description: Enhanced text
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/EnhanceTextResponse"
        "400":
          description: Invalid body or missing text
        "401":
          description: Not authenticated
        "403":
          description: Missing reviews:edit permission
        "500":
          description: Enhancement failed
```

- [ ] Add the `/assets/{id}/finalize` path item directly after the existing `/assets/{id}/complete` path item (ends ~line 215, before the reviews section). Mirror the `completeAssetUpload` shape:

```yaml
  /assets/{id}/finalize:
    post:
      tags: [assets]
      summary: Mark the video as reviewed (finalize)
      description: >
        Transitions the asset to completed. Requires assets:finalize and that
        every video part already has at least one review (400 otherwise).
      operationId: finalizeAsset
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Video marked as reviewed
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/FinalizeAssetResponse"
        "400":
          description: Invalid asset id, or a video part has no reviews
        "401":
          description: Not authenticated
        "403":
          description: Missing assets:finalize permission
        "404":
          description: Video not found or not visible
```

- [ ] In `components.schemas`, after the `UpdateReviewRequest` schema added in T1, add:

```yaml
    EnhanceTextRequest:
      type: object
      properties:
        text:
          type: string
      required: [text]
    EnhanceTextResponse:
      type: object
      properties:
        enhanced_text:
          type: string
      required: [enhanced_text]
    FinalizeAssetResponse:
      type: object
      properties:
        status:
          type: string
          enum: [completed]
      required: [status]
```

- [ ] Lint:

```bash
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && make api:openapi:lint"
```

Expect `0` errors.

- [ ] Regenerate the typed client and confirm it is idempotent (run twice, second run = no diff):

```bash
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile run generate:api && git --no-pager diff --stat mobile/src/api/schema.d.ts"
```

Confirm `schema.d.ts` now references `'/assets/videos/{id}/reviews/{reviewId}'`, `'/reviews/enhance'`, `'/assets/{id}/finalize'` and the schemas `UpdateReviewRequest`, `UpdateReviewResponse`, `EnhanceTextRequest`, `EnhanceTextResponse`, `FinalizeAssetResponse`:

```bash
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && grep -E 'reviews/\{reviewId\}|reviews/enhance|/finalize|UpdateReviewResponse|EnhanceTextResponse|FinalizeAssetResponse' mobile/src/api/schema.d.ts | head"
```

- [ ] Commit:

```bash
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add docs/openapi.yaml mobile/src/api/schema.d.ts && git commit -m 'feat(reviews): surface enhance + finalize to mobile contract + regen client (PR #15)'"
```

### T3 — Hooks: update + delete + enhance review (failing tests first)

**Files:** `mobile/src/api/queries/reviews.test.tsx`

- [ ] Append the import update at the top of `reviews.test.tsx`. Change the existing import line `import { useCreateReviewMutation, useReviewsQuery } from './reviews';` to also pull the three new hooks:

```tsx
import {
  useCreateReviewMutation,
  useDeleteReviewMutation,
  useEnhanceReviewTextMutation,
  useReviewsQuery,
  useUpdateReviewMutation,
} from './reviews';
```

- [ ] Append these tests at the end of `mobile/src/api/queries/reviews.test.tsx` (they reuse the file's existing `wrapper`, `client`/`REVIEW` setup):

```tsx
test('useUpdateReviewMutation puts the content and invalidates reviews and assets', async () => {
  const PUT = jest.fn(async () => ({ data: { ...REVIEW, content: 'Edited' }, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (args: unknown) => void invalidated.push(args)) };
  const { result } = await renderHook(
    () => useUpdateReviewMutation('v1', { PUT } as never, qc as never),
    { wrapper },
  );
  const data = await result.current.mutateAsync({ reviewId: 'r1', content: 'Edited' });
  expect(data.content).toBe('Edited');
  expect(PUT).toHaveBeenCalledWith('/assets/videos/{id}/reviews/{reviewId}', {
    params: { path: { id: 'v1', reviewId: 'r1' } },
    body: { content: 'Edited' },
  });
  expect(invalidated).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ queryKey: ['reviews', 'v1'] }),
      expect.objectContaining({ queryKey: ['assets'] }),
    ]),
  );
});

test('useUpdateReviewMutation surfaces API errors and does not invalidate', async () => {
  const PUT = jest.fn(async () => ({ data: undefined, error: { message: 'forbidden' } }));
  const qc = { invalidateQueries: jest.fn() };
  const { result } = await renderHook(
    () => useUpdateReviewMutation('v1', { PUT } as never, qc as never),
    { wrapper },
  );
  await expect(result.current.mutateAsync({ reviewId: 'r1', content: 'x' })).rejects.toThrow();
  expect(qc.invalidateQueries).not.toHaveBeenCalled();
});

test('useDeleteReviewMutation deletes and invalidates reviews and assets (204 no body)', async () => {
  const DELETE = jest.fn(async () => ({ data: undefined, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (args: unknown) => void invalidated.push(args)) };
  const { result } = await renderHook(
    () => useDeleteReviewMutation('v1', { DELETE } as never, qc as never),
    { wrapper },
  );
  await result.current.mutateAsync({ reviewId: 'r1' });
  expect(DELETE).toHaveBeenCalledWith('/assets/videos/{id}/reviews/{reviewId}', {
    params: { path: { id: 'v1', reviewId: 'r1' } },
  });
  expect(invalidated).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ queryKey: ['reviews', 'v1'] }),
      expect.objectContaining({ queryKey: ['assets'] }),
    ]),
  );
});

test('useDeleteReviewMutation surfaces API errors', async () => {
  const DELETE = jest.fn(async () => ({ data: undefined, error: { message: 'forbidden' } }));
  const qc = { invalidateQueries: jest.fn() };
  const { result } = await renderHook(
    () => useDeleteReviewMutation('v1', { DELETE } as never, qc as never),
    { wrapper },
  );
  await expect(result.current.mutateAsync({ reviewId: 'r1' })).rejects.toThrow();
  expect(qc.invalidateQueries).not.toHaveBeenCalled();
});

test('useEnhanceReviewTextMutation posts the text and returns the enhanced string', async () => {
  const POST = jest.fn(async () => ({ data: { enhanced_text: 'Polished feedback.' }, error: undefined }));
  const { result } = await renderHook(
    () => useEnhanceReviewTextMutation({ POST } as never),
    { wrapper },
  );
  const enhanced = await result.current.mutateAsync({ text: 'good job' });
  expect(enhanced).toBe('Polished feedback.');
  expect(POST).toHaveBeenCalledWith('/reviews/enhance', { body: { text: 'good job' } });
});

test('useEnhanceReviewTextMutation surfaces API errors', async () => {
  const POST = jest.fn(async () => ({ data: undefined, error: { message: 'boom' } }));
  const { result } = await renderHook(
    () => useEnhanceReviewTextMutation({ POST } as never),
    { wrapper },
  );
  await expect(result.current.mutateAsync({ text: 'x' })).rejects.toThrow();
});
```

- [ ] Run and expect FAIL (the three hooks do not exist yet — TypeScript/import error):

```bash
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/api/queries/reviews.test.tsx"
```

Expected output: a failure like `Cannot find name 'useUpdateReviewMutation'` / `'useUpdateReviewMutation' is not exported by './reviews'` and the suite reporting the new tests as failing.

### T4 — Hooks: implement update + delete + enhance review (make T3 pass)

**Files:** `mobile/src/api/queries/reviews.ts`

- [ ] In `mobile/src/api/queries/reviews.ts`, extend the client-type aliases. Replace the existing block:

```ts
type Fetcher = Pick<typeof api, 'GET'>;
type Poster = Pick<typeof api, 'POST'>;
type Invalidator = Pick<typeof queryClient, 'invalidateQueries'>;
```

with:

```ts
type Fetcher = Pick<typeof api, 'GET'>;
type Poster = Pick<typeof api, 'POST'>;
type Putter = Pick<typeof api, 'PUT'>;
type Deleter = Pick<typeof api, 'DELETE'>;
type Invalidator = Pick<typeof queryClient, 'invalidateQueries'>;
```

- [ ] Add the `UpdateReviewInput` type immediately after the existing `CreateReviewInput` type:

```ts
export type UpdateReviewInput = {
  reviewId: string;
  content: string;
};
```

- [ ] Append the three hooks at the end of `reviews.ts` (after `useCreateReviewMutation`):

```ts
export function useUpdateReviewMutation(
  videoId: string,
  client: Putter = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async (input: UpdateReviewInput) => {
      const { data, error } = await (client as typeof api).PUT(
        '/assets/videos/{id}/reviews/{reviewId}',
        {
          params: { path: { id: videoId, reviewId: input.reviewId } },
          body: { content: input.content },
        },
      );
      if (error || !data) throw new Error('Failed to update review');
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['reviews', videoId] });
      await qc.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export function useDeleteReviewMutation(
  videoId: string,
  client: Deleter = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async (input: { reviewId: string }) => {
      const { error } = await (client as typeof api).DELETE(
        '/assets/videos/{id}/reviews/{reviewId}',
        {
          params: { path: { id: videoId, reviewId: input.reviewId } },
        },
      );
      // 204 returns no body — treat error === undefined as success
      if (error !== undefined) throw new Error('Failed to delete review');
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['reviews', videoId] });
      await qc.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export function useEnhanceReviewTextMutation(client: Poster = api) {
  return useMutation({
    mutationFn: async (input: { text: string }) => {
      const { data, error } = await (client as typeof api).POST('/reviews/enhance', {
        body: { text: input.text },
      });
      if (error || !data) throw new Error('Failed to enhance text');
      return data.enhanced_text;
    },
  });
}
```

- [ ] Run and expect PASS:

```bash
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/api/queries/reviews.test.tsx"
```

Expect all review-hook tests green (the original 4 + the 6 added in T3).

- [ ] Commit:

```bash
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add mobile/src/api/queries/reviews.ts mobile/src/api/queries/reviews.test.tsx && git commit -m 'feat(reviews): mobile update/delete/enhance review hooks (PR #15)'"
```

### T5 — Hook: finalize asset (failing test → implement → pass)

**Files:** `mobile/src/api/queries/assets.test.tsx`, `mobile/src/api/queries/assets.ts`

- [ ] Open `mobile/src/api/queries/assets.test.tsx` and add the new hook to its import from `./assets`. (If the file's existing import is `import { useAssetQuery, useAssetsQuery } from './assets';`, change it to include `useFinalizeAssetMutation`.)

```tsx
import { useAssetQuery, useAssetsQuery, useFinalizeAssetMutation } from './assets';
```

- [ ] Append these tests to `mobile/src/api/queries/assets.test.tsx`. They reuse the file's existing `wrapper` (the assets test file follows the same `QueryClientProvider` wrapper + `expo-secure-store` mock as `reviews.test.tsx`; mirror that setup if a `wrapper` is not already in scope):

```tsx
test('useFinalizeAssetMutation posts finalize and invalidates the asset and list', async () => {
  const POST = jest.fn(async () => ({ data: { status: 'completed' }, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (args: unknown) => void invalidated.push(args)) };
  const { result } = await renderHook(
    () => useFinalizeAssetMutation('a1', { POST } as never, qc as never),
    { wrapper },
  );
  const data = await result.current.mutateAsync();
  expect(data.status).toBe('completed');
  expect(POST).toHaveBeenCalledWith('/assets/{id}/finalize', {
    params: { path: { id: 'a1' } },
  });
  expect(invalidated).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ queryKey: ['assets', 'a1'] }),
      expect.objectContaining({ queryKey: ['assets'] }),
    ]),
  );
});

test('useFinalizeAssetMutation surfaces the unreviewed-parts 400 and does not invalidate', async () => {
  const POST = jest.fn(async () => ({ data: undefined, error: { message: 'no reviews' } }));
  const qc = { invalidateQueries: jest.fn() };
  const { result } = await renderHook(
    () => useFinalizeAssetMutation('a1', { POST } as never, qc as never),
    { wrapper },
  );
  await expect(result.current.mutateAsync()).rejects.toThrow();
  expect(qc.invalidateQueries).not.toHaveBeenCalled();
});
```

> If `assets.test.tsx` does not already import `renderHook`/`waitFor` and define a `wrapper`, copy the header block verbatim from `reviews.test.tsx` lines 1–27 (the `expo-secure-store` mock, the `client`/`beforeEach`/`afterEach`, and the `wrapper` function).

- [ ] Run and expect FAIL (`useFinalizeAssetMutation` is not exported):

```bash
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/api/queries/assets.test.tsx"
```

- [ ] In `mobile/src/api/queries/assets.ts`, add the imports + hook. Change the imports to bring in `useMutation` and the query client:

```ts
import { useMutation, useQuery } from '@tanstack/react-query';
import type { components } from '../schema';
import { api } from '../../auth/auth-store';
import { queryClient } from '../query-client';
```

Add the client-type aliases below the existing `type Fetcher = ...` line:

```ts
type Poster = Pick<typeof api, 'POST'>;
type Invalidator = Pick<typeof queryClient, 'invalidateQueries'>;
```

Append the hook at the end of the file:

```ts
export function useFinalizeAssetMutation(
  assetId: string,
  client: Poster = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await (client as typeof api).POST('/assets/{id}/finalize', {
        params: { path: { id: assetId } },
      });
      if (error || !data) throw new Error('Failed to mark video as reviewed');
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['assets', assetId] });
      await qc.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}
```

- [ ] Run and expect PASS:

```bash
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/api/queries/assets.test.tsx"
```

- [ ] Commit:

```bash
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add mobile/src/api/queries/assets.ts mobile/src/api/queries/assets.test.tsx && git commit -m 'feat(assets): mobile finalize-asset (mark reviewed) hook (PR #15)'"
```

### T6 — i18n: add the one missing key + sync

**Files:** `web/dashboard-next/public/i18n/{en,de,fr}.json`, then synced `mobile/src/i18n/locales/{en,de,fr}.json`

Verified: every label this slice needs already exists in the mobile locales **except** `videos.confirmDeleteCommentTitle` (the title for the delete `ZConfirmDialog`; mobile's `ZConfirmDialog` requires a `title`, unlike the web's hover menu). Add it to the web source so the sync is the source of truth, then sync.

Two i18n source edits are required:
1. **Add** `videos.confirmDeleteCommentTitle` (missing entirely).
2. **Add** the i18next-compatible replies-plural keys `videos.reply_one` / `videos.reply_other`. ⚠️ Do **NOT** touch or remove the existing flat `"reply.one"` / `"reply.other"` keys — the web Transloco app still references `'videos.reply.one'` / `'videos.reply.other'` (`video-details-page.component.ts:312-314`), so removing them breaks the web. Mobile i18next cannot resolve those flat dotted keys (see the broken-keys note in the i18n section above), so we add `_one`/`_other`-suffixed siblings that i18next resolves via `t('videos.reply', { count })`. Both spellings coexist.

- [ ] In `web/dashboard-next/public/i18n/en.json`, inside the `"videos"` object, next to the existing `"deleteComment"`/`"confirmDeleteComment"` keys (~line 278), add:

```json
    "confirmDeleteCommentTitle": "Delete comment?",
```

- [ ] In `web/dashboard-next/public/i18n/en.json`, next to the existing flat `"reply.one"`/`"reply.other"` (~line 271), add the i18next plural siblings (keep the flat ones):

```json
    "reply_one": "reply",
    "reply_other": "replies",
```

- [ ] In `web/dashboard-next/public/i18n/de.json`, in the `"videos"` object next to `"confirmDeleteComment"`, add:

```json
    "confirmDeleteCommentTitle": "Kommentar löschen?",
```

  and next to the flat `"reply.one"`/`"reply.other"` (~line 284) add the i18next siblings:

```json
    "reply_one": "Antwort",
    "reply_other": "Antworten",
```

- [ ] In `web/dashboard-next/public/i18n/fr.json`, in the `"videos"` object next to `"confirmDeleteComment"`, add:

```json
    "confirmDeleteCommentTitle": "Supprimer le commentaire ?",
```

  and next to the flat `"reply.one"`/`"reply.other"` (~line 271) add the i18next siblings:

```json
    "reply_one": "réponse",
    "reply_other": "réponses",
```

- [ ] Run the destructive sync, then re-add mobile-only keys:

```bash
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile run sync:i18n"
```

⚠️ `sync:i18n` drops mobile-only keys (e.g. `sessions.call.sessionFallback`). After syncing, diff the mobile locales and re-add by hand any mobile-only key the sync removed:

```bash
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git --no-pager diff mobile/src/i18n/locales/"
```

Confirm the diff shows `confirmDeleteCommentTitle` and `reply_one`/`reply_other` ADDED in en/de/fr and shows NO unexpected deletions (if any mobile-only key was removed, restore it from the pre-sync version).

- [ ] Verify both new keys landed in all three mobile locales:

```bash
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && grep -lE 'confirmDeleteCommentTitle' mobile/src/i18n/locales/{en,de,fr}.json && grep -lE 'reply_one' mobile/src/i18n/locales/{en,de,fr}.json"
```

Expect all three paths printed for each grep.

- [ ] Sanity-check the i18next plural call resolves (the flat `reply.one`/`reply.other` keys are unreachable; the `_one`/`_other` keys are what `t('videos.reply', { count })` uses):

```bash
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && grep -E '\"reply_(one|other)\"|\"reply\.(one|other)\"' mobile/src/i18n/locales/en.json"
```

Expect both the flat (carried over from web) and the `_`-suffixed (newly added) pairs to be present in the synced mobile locale.

- [ ] Commit:

```bash
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add web/dashboard-next/public/i18n/en.json web/dashboard-next/public/i18n/de.json web/dashboard-next/public/i18n/fr.json mobile/src/i18n/locales/en.json mobile/src/i18n/locales/de.json mobile/src/i18n/locales/fr.json && git commit -m 'i18n: add videos.confirmDeleteCommentTitle + i18next reply_one/_other plural keys, sync mobile locales (PR #15)'"
```

### T7 — Extend `ReviewItem` + `ReviewComposer`, wire the write-lifecycle into `asset/[id].tsx`

> ⚠️ **GATE:** `mobile/src/app/asset/[id].tsx` is in the shared working tree. Do NOT start T7 until the user signals the parallel session is done. `ReviewItem`/`ReviewComposer` edits are additive (new optional props) and safe earlier, but keep them in this one task to land the screen wiring atomically.

**Files:** `mobile/src/components/review-item.tsx`, `mobile/src/components/review-composer.tsx`, `mobile/src/app/asset/[id].tsx`

#### T7a — `ReviewItem`: edit/delete affordances + inline edit form + collapse

Web parity (`video-details-page.component.ts`): each comment shows edit/delete actions (web `z-comment-actions`, gated `canEditReviews()`/`canDeleteReviews()`), an inline edit form (`z-textarea` + enhance + cancel/save) when `editingReviewId === id`, and a per-thread replies collapse toggle (web `videos.reply.one/other` count-plural; on mobile `t('videos.reply', { count })` against the `reply_one`/`reply_other` keys added in T6). On mobile the counterpart of the hover overflow is inline `ZIconButton`s (Pencil + Trash) in the meta row; the inline edit form lives inside `ReviewItem`; the collapse toggle lives in `asset/[id].tsx` (T7c), not in `ReviewItem`.

- [ ] Replace the import block at the top of `review-item.tsx`:

```tsx
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Pencil, Reply, Sparkles, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { Review } from '../api/queries/reviews';
import { initialsFromName } from '../lib/avatar';
import { formatRelativeTime } from '../lib/datetime';
import { colors } from '../theme/colors';
import { ZAvatar } from './ui/z-avatar';
import { ZButton } from './ui/z-button';
import { ZChip } from './ui/z-chip';
import { ZIconButton } from './ui/z-icon-button';
import { ZTextarea } from './ui/z-textarea';
```

> **Depends on WP-UI0.** This import block drops `review-item.tsx`'s old local `formatRelativeTime` (lines ~21-36 of the pre-change file) and consumes the shared `formatRelativeTime(iso, t)` from `mobile/src/lib/datetime.ts` instead. Delete the inline `function formatRelativeTime(isoString: string)` from this file in the same edit — do not leave a dead duplicate. Note the new signature takes `t` as a second argument (the shared helper is i18n-aware, e.g. `common.labels.minutesShort`), so the meta-row call below is `formatRelativeTime(review.created_at, t)`.

- [ ] Replace the `ReviewItemProps` type:

```tsx
export type ReviewItemProps = {
  review: Review;
  onSeek?: (seconds: number) => void;
  onReply?: (review: Review) => void;
  isReply?: boolean;
  /** Shown only when set; gates the Pencil action. */
  onEdit?: (review: Review, content: string) => Promise<void> | void;
  /** Shown only when set; gates the Trash action. */
  onDelete?: (review: Review) => void;
  /** Async text enhancer used by the inline edit form's Sparkles action. */
  onEnhance?: (text: string) => Promise<string | null>;
  /** True while a delete confirmation for THIS review is pending (disables the row's actions). */
  deleting?: boolean;
};
```

- [ ] Replace the component body. The meta row gains gated edit/delete `ZIconButton`s; an inline edit form replaces the body when this row is being edited:

```tsx
export function ReviewItem({
  review,
  onSeek,
  onReply,
  isReply = false,
  onEdit,
  onDelete,
  onEnhance,
  deleting = false,
}: ReviewItemProps) {
  const { t } = useTranslation();
  const authorName = review.author?.name ?? t('videos.unknownAuthor');
  const showReplyButton = Boolean(onReply) && !isReply;

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(review.content);
  const [savingEdit, setSavingEdit] = useState(false);
  const [enhancing, setEnhancing] = useState(false);

  function startEdit() {
    setDraft(review.content);
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setDraft(review.content);
  }

  async function saveEdit() {
    const trimmed = draft.trim();
    if (!trimmed || savingEdit || !onEdit) return;
    setSavingEdit(true);
    try {
      await onEdit(review, trimmed);
      setIsEditing(false);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleEnhance() {
    const trimmed = draft.trim();
    if (!trimmed || enhancing || !onEnhance) return;
    setEnhancing(true);
    try {
      const enhanced = await onEnhance(trimmed);
      if (enhanced) setDraft(enhanced);
    } finally {
      setEnhancing(false);
    }
  }

  return (
    <View className="flex-row items-start gap-2">
      <ZAvatar
        image={review.author?.avatar}
        fallback={initialsFromName(authorName)}
        alt={authorName}
        size={isReply ? 28 : 36}
      />

      <View className="min-w-0 flex-1">
        <Text
          testID="review-author"
          className="text-sm font-semibold text-z-text"
          numberOfLines={1}
        >
          {authorName}
        </Text>

        {isEditing ? (
          <View className="mt-2 gap-2" testID="review-edit-form">
            <ZTextarea
              testID="review-edit-input"
              accessibilityLabel={t('videos.commentPlaceholder')}
              placeholder={t('videos.commentPlaceholder')}
              value={draft}
              onChangeText={setDraft}
              rows={3}
              disabled={savingEdit}
            />
            <View className="flex-row items-center justify-between gap-2">
              {onEnhance ? (
                <ZButton
                  label={enhancing ? t('videos.enhancing') : t('videos.enhanceText')}
                  variant="secondary"
                  testID="review-edit-enhance"
                  loading={enhancing}
                  disabled={!draft.trim() || savingEdit}
                  icon={<Sparkles color={colors.text} size={16} />}
                  onPress={() => void handleEnhance()}
                />
              ) : (
                <View />
              )}
              <View className="flex-row gap-2">
                <ZButton
                  label={t('common.actions.cancel')}
                  variant="secondary"
                  testID="review-edit-cancel"
                  disabled={savingEdit || enhancing}
                  onPress={cancelEdit}
                />
                <ZButton
                  label={t('common.actions.save')}
                  testID="review-edit-save"
                  loading={savingEdit}
                  disabled={!draft.trim() || enhancing}
                  onPress={() => void saveEdit()}
                />
              </View>
            </View>
          </View>
        ) : (
          <Text className="mt-1 text-sm leading-6 text-z-text">{review.content}</Text>
        )}

        {!isEditing && (
          <View className="mt-1 flex-row flex-wrap items-center gap-2">
            {review.timestamp_seconds !== undefined && review.timestamp_seconds !== null && (
              <ZChip
                label={formatTimestamp(review.timestamp_seconds)}
                onPress={onSeek ? () => onSeek(review.timestamp_seconds!) : undefined}
              />
            )}

            <Text className="text-xs text-z-muted">{formatRelativeTime(review.created_at, t)}</Text>

            {showReplyButton && (
              <ZIconButton
                label={t('videos.reply')}
                size="sm"
                testID="review-reply"
                onPress={() => onReply!(review)}
              >
                <Reply color={colors.muted} size={14} />
              </ZIconButton>
            )}

            {onEdit && (
              <ZIconButton
                label={t('videos.editComment')}
                size="sm"
                testID="review-edit"
                disabled={deleting}
                onPress={startEdit}
              >
                <Pencil color={colors.muted} size={14} />
              </ZIconButton>
            )}

            {onDelete && (
              <ZIconButton
                label={t('videos.deleteComment')}
                size="sm"
                testID="review-delete"
                disabled={deleting}
                onPress={() => onDelete(review)}
              >
                <Trash2 color={colors.danger} size={14} />
              </ZIconButton>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
```

> The replies-collapse toggle (`ChevronDown`/`ChevronRight`) is **NOT** in `review-item.tsx`. It lives in `asset/[id].tsx` next to the thread (it needs the screen's `collapsed` set + `repliesByParent`, which `ReviewItem` does not own), mirroring the web `@if (thread.replies.length > 0)` button (`video-details-page.component.ts:297-317`). Its full implementation + the chevron imports are in T7c. `review-item.tsx` therefore imports only the icons it uses (`Pencil`/`Reply`/`Sparkles`/`Trash2`).

#### T7b — `ReviewComposer`: AI-enhance action

Web parity: the composer/edit forms expose a Sparkles "enhance" button (`videos.enhanceText`/`videos.enhancing`) that rewrites the current draft. Add it to the composer for the create path.

- [ ] In `review-composer.tsx`, add `Sparkles` to the lucide import and `ZButton` to the UI imports:

```tsx
import { Send, Sparkles, X } from 'lucide-react-native';
```
```tsx
import { ZButton } from './ui/z-button';
```

- [ ] Add the `onEnhance` prop to `ReviewComposerProps` (after `onCancelReply`):

```tsx
  /** Async text enhancer; when set, a Sparkles button rewrites the draft. */
  onEnhance?: (text: string) => Promise<string | null>;
```

- [ ] Destructure it in the component signature and add enhance state + handler. After `const [busy, setBusy] = useState(false);` add:

```tsx
  const [enhancing, setEnhancing] = useState(false);

  async function handleEnhance() {
    const trimmed = content.trim();
    if (!trimmed || enhancing || !onEnhance) return;
    setEnhancing(true);
    try {
      const enhanced = await onEnhance(trimmed);
      if (enhanced) setContent(enhanced);
    } finally {
      setEnhancing(false);
    }
  }
```

(Add `onEnhance` to the destructured props in the function signature.)

- [ ] Render the enhance button in the input row, before the send `ZIconButton`, only when `onEnhance` is provided and not in reply mode (web shows enhance on the comment/edit forms):

```tsx
        {onEnhance && !isReplyMode ? (
          <ZIconButton
            label={enhancing ? t('videos.enhancing') : t('videos.enhanceText')}
            size="sm"
            testID="review-enhance"
            disabled={!content.trim() || busy || enhancing}
            onPress={() => void handleEnhance()}
          >
            <Sparkles color={colors.muted} size={16} />
          </ZIconButton>
        ) : null}
```

> `ZButton` is imported for parity with the edit-form button but the composer's inline action uses `ZIconButton` to fit the existing send-row layout; if the linter flags `ZButton` as unused here, drop that import — it is only required in `review-item.tsx`.

#### T7c — Wire into `asset/[id].tsx`: enhance + edit + delete (confirm) + finalize (confirm + guard)

- [ ] Update the imports in `mobile/src/app/asset/[id].tsx`. Add the new hooks, the toast helper, the confirm dialog, and the Check icon:

```tsx
import { useAssetQuery, useFinalizeAssetMutation } from '../../api/queries/assets';
import {
  useCreateReviewMutation,
  useDeleteReviewMutation,
  useEnhanceReviewTextMutation,
  useReviewsQuery,
  useUpdateReviewMutation,
} from '../../api/queries/reviews';
```
```tsx
import { ArrowLeft, Check, ChevronDown, ChevronRight, Clock, MessageCircle } from 'lucide-react-native';
```
```tsx
import { ZConfirmDialog } from '../../components/ui/z-confirm-dialog';
import { showToast } from '../../components/ui/z-toast';
```

(`ChevronDown`/`ChevronRight` power the replies-collapse toggle added later in this task.)

- [ ] Extend `ReviewsSectionProps` to receive the reviewer's edit/delete permission flags (the screen computes these from `useAuth`):

```tsx
type ReviewsSectionProps = {
  videoId: string;
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  canCompose: boolean;
  canEdit: boolean;
  canDelete: boolean;
};
```

- [ ] In `ReviewsSection`, add the new hooks + a shared enhance handler + a delete-confirm target state. After the existing `const { mutateAsync } = useCreateReviewMutation(videoId);` line add:

```tsx
  const { mutateAsync: updateReview } = useUpdateReviewMutation(videoId);
  const { mutateAsync: deleteReview } = useDeleteReviewMutation(videoId);
  const { mutateAsync: enhanceText } = useEnhanceReviewTextMutation();
  const [pendingDelete, setPendingDelete] = useState<Review | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleEnhance(text: string): Promise<string | null> {
    try {
      const enhanced = await enhanceText({ text });
      showToast(t('toast.successTitle'), t('videos.textEnhanced'), 'success');
      return enhanced;
    } catch {
      showToast(t('toast.errorTitle'), t('videos.textEnhanceFailed'), 'error');
      return null;
    }
  }

  async function handleEdit(review: Review, content: string) {
    setMutationError(null);
    try {
      await updateReview({ reviewId: review.id, content });
    } catch {
      setMutationError(t('videos.reviewUpdateFailed'));
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || deleting) return;
    setMutationError(null);
    setDeleting(true);
    try {
      await deleteReview({ reviewId: pendingDelete.id });
      setPendingDelete(null);
    } catch {
      setMutationError(t('videos.commentDeleteFailed'));
    } finally {
      setDeleting(false);
    }
  }
```

- [ ] Add the replies-collapse state to `ReviewsSection`. After the `pendingDelete`/`deleting` state added above, add a per-thread collapse set + toggle (mirrors web `collapsedThreads` signal + `toggleThread`, `video-details-page.component.ts:297-317`):

```tsx
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  function toggleThread(rootId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(rootId)) next.delete(rootId);
      else next.add(rootId);
      return next;
    });
  }
```

- [ ] Pass the new props to the top-level `ReviewItem` and the reply `ReviewItem`s, wire the composer's enhance, and gate the reply list behind a collapse toggle. In the `topLevel.map(...)` block (`asset/[id].tsx:147-154`) replace the root `<ReviewItem .../>` and reply map with the block below. The toggle renders only when the thread has replies, shows a `ChevronRight` when collapsed / `ChevronDown` when expanded, and the count label uses the i18next plural `t('videos.reply', { count })` (web `video-details:309-315`):

```tsx
            <ReviewItem
              review={review}
              onSeek={seekTo}
              onReply={(r) => setReplyingTo(r)}
              onEdit={canEdit ? handleEdit : undefined}
              onDelete={canDelete ? (r) => setPendingDelete(r) : undefined}
              onEnhance={canEdit ? handleEnhance : undefined}
              deleting={deleting && pendingDelete?.id === review.id}
            />
            {(repliesByParent.get(review.id) ?? []).length > 0 &&
              (() => {
                const replyCount = (repliesByParent.get(review.id) ?? []).length;
                const isCollapsed = collapsed.has(review.id);
                return (
                  <ZButton
                    label={`${replyCount} ${t('videos.reply', { count: replyCount })}`}
                    variant="ghost"
                    testID={`thread-collapse-${review.id}`}
                    icon={
                      isCollapsed ? (
                        <ChevronRight color={colors.muted} size={14} />
                      ) : (
                        <ChevronDown color={colors.muted} size={14} />
                      )
                    }
                    onPress={() => toggleThread(review.id)}
                  />
                );
              })()}
            {!collapsed.has(review.id) &&
              (repliesByParent.get(review.id) ?? []).map((reply) => (
                <ReviewItem
                  key={reply.id}
                  review={reply}
                  onSeek={seekTo}
                  isReply
                  onEdit={canEdit ? handleEdit : undefined}
                  onDelete={canDelete ? (r) => setPendingDelete(r) : undefined}
                  onEnhance={canEdit ? handleEnhance : undefined}
                  deleting={deleting && pendingDelete?.id === reply.id}
                />
              ))}
```

> Primitive choice: the toggle is a chrome-less **`ZButton variant="ghost"`** (label = `"{count} {reply|replies}"`, leading chevron `icon`), NOT `ZIconButton` — `ZIconButton` is a fixed-size square for a single icon (`h-9 w-9`, no text/`accessibilityState` prop), whereas the web counterpart (`video-details:298-316`) is an inline text+icon button. `ZButton` (already imported at `asset/[id].tsx:17`) renders `icon` + `label` in a `flex-row` and its `label` doubles as the accessible name — matching the web. The count label is composed inline (`${replyCount} ${t('videos.reply', { count })}`) because the `reply_one`/`reply_other` values are just "reply"/"replies"; i18next selects the plural form via `{ count }`. `ChevronDown`/`ChevronRight` come from the combined lucide import at the top of T7c. `review-item.tsx` does NOT import the chevrons (the T7a note flags this) — the real consumer is the screen.

- [ ] Add `onEnhance` to the create `ReviewComposer` (only when the user may edit text, matching the web's `reviews:edit`-gated enhance):

```tsx
          <ReviewComposer
            onSubmit={handleSubmit}
            getCurrentTime={replyingTo ? undefined : getCurrentTime}
            replyingTo={replyingTo ?? undefined}
            onCancelReply={() => setReplyingTo(null)}
            onEnhance={canEdit ? handleEnhance : undefined}
          />
```

- [ ] Render the delete `ZConfirmDialog` at the end of the `ReviewsSection` `ZCard` (just before the closing `</ZCard>`):

```tsx
      <ZConfirmDialog
        visible={pendingDelete !== null}
        title={t('videos.confirmDeleteCommentTitle')}
        description={t('videos.confirmDeleteComment')}
        tone="danger"
        confirmLabel={t('common.actions.delete')}
        cancelLabel={t('common.actions.cancel')}
        confirmDisabled={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
        testID="review-delete-confirm"
      />
```

- [ ] In `AssetDetailScreen`, compute the reviewer permission flags next to the existing `canCompose` and pass them down. Replace the `canCompose` block:

```tsx
  const permissions = useAuth((s) => s.user?.permissions ?? null);
  const isFinalized = data?.status === 'completed';
  const canCompose = (permissions?.includes('reviews:create') ?? false) && !isFinalized;
  const canEdit = (permissions?.includes('reviews:edit') ?? false) && !isFinalized;
  const canDelete = (permissions?.includes('reviews:delete') ?? false) && !isFinalized;
  const canFinalize = (permissions?.includes('assets:finalize') ?? false) && !isFinalized;
```

- [ ] Pass the flags to `ReviewsSection` (the JSX where it is rendered):

```tsx
            <ReviewsSection
              key={active.id}
              videoId={active.id}
              seekTo={seekTo}
              getCurrentTime={getCurrentTime}
              canCompose={canCompose}
              canEdit={canEdit}
              canDelete={canDelete}
            />
```

- [ ] Add the finalize action + its two dialogs into the metadata `ZCard`. First compute the unreviewed-parts guard near the other derived values in `AssetDetailScreen` (after `const videos = data.videos ?? [];`):

```tsx
  const hasUnreviewedParts = videos.some((v) => v.review_count === 0);
```

Add finalize state + handler in `AssetDetailScreen` (above the `return`):

```tsx
  const { mutateAsync: finalizeAsset } = useFinalizeAssetMutation(id ?? '');
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [unreviewedOpen, setUnreviewedOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  async function confirmFinalize() {
    if (finalizing) return;
    setFinalizing(true);
    try {
      await finalizeAsset();
      setFinalizeOpen(false);
      showToast(t('toast.successTitle'), t('videos.markedReviewed'), 'success');
    } catch {
      showToast(t('toast.errorTitle'), t('videos.markReviewedFailed'), 'error');
    } finally {
      setFinalizing(false);
    }
  }

  function onPressFinalize() {
    if (hasUnreviewedParts) {
      setUnreviewedOpen(true);
    } else {
      setFinalizeOpen(true);
    }
  }
```

- [ ] Inside the metadata `ZCard` (the one rendering the status `ZBadge` + title), add a `markReviewed` `ZButton` after the title, gated on `canFinalize` (mirrors the web `canFinalize() && !isFinalized()` button placed beside the status):

```tsx
            {canFinalize ? (
              <ZButton
                label={t('videos.markReviewed')}
                testID="asset-finalize"
                icon={<Check color={colors.onPrimary} size={16} />}
                onPress={onPressFinalize}
              />
            ) : null}
```

- [ ] Render the two finalize dialogs at the end of the inner content `View` (after the `ReviewsSection` block, still inside the `<View className="gap-4 p-4">`):

```tsx
          <ZConfirmDialog
            visible={finalizeOpen}
            title={t('videos.markVideoReviewed')}
            description={t('videos.confirmMarkReviewed')}
            tone="warning"
            confirmLabel={t('videos.markReviewed')}
            cancelLabel={t('common.actions.cancel')}
            confirmDisabled={finalizing}
            onConfirm={() => void confirmFinalize()}
            onCancel={() => setFinalizeOpen(false)}
            testID="asset-finalize-confirm"
          />
          <ZConfirmDialog
            visible={unreviewedOpen}
            title={t('videos.cannotMarkReviewedTitle')}
            description={t('videos.cannotMarkReviewed')}
            tone="info"
            confirmOnly
            confirmLabel={t('common.actions.done')}
            onConfirm={() => setUnreviewedOpen(false)}
            onCancel={() => setUnreviewedOpen(false)}
            testID="asset-finalize-unreviewed"
          />
```

> `colors.onPrimary` is used by `ZButton`'s primary spinner (verified in `z-button.tsx`); it exists in `theme/colors.ts`. If `colors.onPrimary` is not present, use `colors.bg` (the value `ReviewComposer` already uses for the on-primary send icon).

- [ ] Add a screen-level component test. Create `mobile/src/components/__tests__/review-item.test.tsx` (NOT under `src/app/`):

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

import { initI18n } from '../../i18n';
import { ReviewItem } from '../review-item';

beforeAll(() => initI18n('en'));

const REVIEW = {
  id: 'r1',
  content: 'Solid kick',
  author: { name: 'Coach' },
  created_at: '2026-06-12T10:00:00Z',
};

test('shows edit + delete actions only when handlers are provided', async () => {
  await render(<ReviewItem review={REVIEW as never} />);
  expect(screen.queryByTestId('review-edit')).toBeNull();
  expect(screen.queryByTestId('review-delete')).toBeNull();
});

test('opens the inline edit form and saves the trimmed content', async () => {
  const onEdit = jest.fn(async () => undefined);
  await render(<ReviewItem review={REVIEW as never} onEdit={onEdit} />);
  fireEvent.press(screen.getByTestId('review-edit'));
  fireEvent.changeText(screen.getByTestId('review-edit-input'), '  Reworked note  ');
  fireEvent.press(screen.getByTestId('review-edit-save'));
  await waitFor(() => expect(onEdit).toHaveBeenCalledWith(REVIEW, 'Reworked note'));
});

test('delete action invokes onDelete with the review', async () => {
  const onDelete = jest.fn();
  await render(<ReviewItem review={REVIEW as never} onDelete={onDelete} />);
  fireEvent.press(screen.getByTestId('review-delete'));
  expect(onDelete).toHaveBeenCalledWith(REVIEW);
});

test('enhance swaps the draft with the enhanced text', async () => {
  const onEdit = jest.fn(async () => undefined);
  const onEnhance = jest.fn(async () => 'Polished note');
  await render(<ReviewItem review={REVIEW as never} onEdit={onEdit} onEnhance={onEnhance} />);
  fireEvent.press(screen.getByTestId('review-edit'));
  fireEvent.press(screen.getByTestId('review-edit-enhance'));
  await waitFor(() => expect(onEnhance).toHaveBeenCalled());
  fireEvent.press(screen.getByTestId('review-edit-save'));
  await waitFor(() => expect(onEdit).toHaveBeenCalledWith(REVIEW, 'Polished note'));
});
```

- [ ] Run the component test (expect PASS after the T7a impl):

```bash
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/components/__tests__/review-item.test.tsx"
```

- [ ] Run lint + typecheck:

```bash
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && make mobile:lint && make mobile:typecheck"
```

Expect 0 errors. (If `react-i18next`'s `t` is not in scope inside `ReviewsSection`, it already is — `const { t } = useTranslation();` is at the top of `ReviewsSection`. `useTranslation` is also already imported at module scope; `AssetDetailScreen` has its own `const { t } = useTranslation();`.)

- [ ] Commit:

```bash
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add mobile/src/components/review-item.tsx mobile/src/components/review-composer.tsx mobile/src/app/asset/'[id]'.tsx mobile/src/components/__tests__/review-item.test.tsx && git commit -m 'feat(reviews): mobile edit/delete/enhance comment + finalize video (PR #15)'"
```

### T8 — Full mobile gate + screenshots

> Only run the full suite after T7 (the parallel session must be done — this touches shared screen files).

- [ ] Full mobile gate:

```bash
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && make mobile:lint && make mobile:typecheck && make mobile:test"
```

Expect all green.

- [ ] Capture emulator screenshots (per `mobile/AGENTS.md` — UI changes require them) on the video-detail screen as a reviewer: (a) a comment row showing the edit + delete icons; (b) the inline edit form with the Sparkles enhance button; (c) the delete `ZConfirmDialog`; (d) the "Mark reviewed" button + its confirm dialog; (e) the unreviewed-parts info dialog. Attach to the PR #15 description.

---

## UI Parity & Component Reuse

Header treatment: this is a **detail screen** (`asset/[id].tsx`) — it keeps its existing entity hero card (status `ZBadge` + title + group). The finalize action is a contextual action **on that detail card** (a `ZButton`, mirroring the web's status-adjacent "Mark reviewed" button), NOT a FAB and NOT a list header. No new screen, no new header pattern.

| Screen element (web counterpart) | Mobile primitive / domain component (path) | New? |
| --- | --- | --- |
| Comment row (web thread `article` + `z-avatar`) | **EXTEND** `ReviewItem` (`mobile/src/components/review-item.tsx`) — add edit/delete/enhance props + inline edit form | Reuse (extended) |
| Edit comment action (web `z-comment-actions` edit) | `ZIconButton` (`mobile/src/components/ui/z-icon-button.tsx`) with `Pencil`, gated by `onEdit` prop, inside `ReviewItem` | Reuse |
| Delete comment action (web `z-comment-actions` delete) | `ZIconButton` with `Trash2`, gated by `onDelete` prop, inside `ReviewItem` | Reuse |
| Inline edit form (web `<form>` + `z-textarea` + save/cancel) | `ZTextarea` + `ZButton`×3 (cancel/save/enhance) inside `ReviewItem` | Reuse |
| Delete confirmation (web `z-confirm-dialog` danger) | `ZConfirmDialog` tone=`danger` (`mobile/src/components/ui/z-confirm-dialog.tsx`) in `asset/[id].tsx` | Reuse |
| AI-enhance (web Sparkles `z-button` + toast) | **EXTEND** `ReviewComposer` (`review-composer.tsx`) `onEnhance` prop → `ZIconButton` Sparkles; edit form uses `ZButton` Sparkles; `showToast` for success/fail | Reuse (extended) |
| Replies-collapse toggle (web inline chevron text-button, `videos.reply` count-plural) | `ZButton variant="ghost"` (label `"{N} {reply\|replies}"`, leading `ChevronRight` collapsed / `ChevronDown` expanded) in `asset/[id].tsx` thread block, gating the reply list behind a per-thread `collapsed` set — full impl in T7c | Reuse |
| Finalize "Mark reviewed" (web status-adjacent `z-button` + `lucideCheck`) | `ZButton` with `Check` icon on the metadata `ZCard`, gated `assets:finalize && !finalized` | Reuse |
| Finalize confirm (web `z-confirm-dialog` warning) | `ZConfirmDialog` tone=`warning` in `asset/[id].tsx` | Reuse |
| Unreviewed-parts guard (web `z-confirm-dialog` info, `confirmOnly`) | `ZConfirmDialog` tone=`info` `confirmOnly` (done label) in `asset/[id].tsx` | Reuse |
| Mutation feedback | inline error banner (existing `mutationError` `Text` in `ReviewsSection`) for edit/delete save failures — edit → `videos.reviewUpdateFailed`, delete → `videos.commentDeleteFailed`; `showToast` (`z-toast.tsx`) for enhance (success `videos.textEnhanced` / fail `videos.textEnhanceFailed`) + finalize (success `videos.markedReviewed` / fail `videos.markReviewedFailed`) | Reuse |

**No new components.** Every element composes existing `z-*` primitives or extends the two named domain components (`ReviewItem`, `ReviewComposer`) per the package brief. No new `z-*` primitive, no SHARED flag needed.

**Mandatory-pattern compliance:**
- Screen root stays `ZScreen` (unchanged). No bare `View` root.
- Controls are `z-*` only (`ZIconButton`/`ZButton`/`ZTextarea`); no raw `Pressable`/`TextInput` introduced.
- Colors via `theme/colors.ts` (`colors.muted`/`colors.danger`/`colors.text`/`colors.onPrimary`) + NativeWind `z-*` classes; no raw hex.
- **Reference convention (other plans align to this one):** form-save FAILURE → inline error banner (edit → `videos.reviewUpdateFailed`, delete → `videos.commentDeleteFailed`; specific keys, never the generic `videos.phase4.commentsFailed`). Fire-and-forget actions → `ZToast` (enhance success/fail; finalize success `videos.markedReviewed` / fail `videos.markReviewedFailed`). Destructive delete → `ZConfirmDialog` (never inline two-step). Finalize → `ZConfirmDialog` + the unreviewed-parts info dialog.
- Four query states already implemented in `ReviewsSection` (pending `ZSkeleton` / error+retry / empty `ZEmptyState` / data); unchanged by this slice.
- Keyboard: the inline edit form's `ZTextarea` sits inside the screen's existing `ScrollView`; the comment composer keyboard behaviour is unchanged. (No new full-screen keyboard form is introduced; if reviewers want `ZKeyboardAvoidingView` around the edit form, that is a follow-up — the edit form is inline within the existing scroll surface, matching the create composer's existing handling.)
- i18n: every label/`accessibilityLabel`/toast string uses an existing key (or the one key added in T6); no literals.

---

## SELF-REVIEW

**Spec coverage (every backend endpoint + web behaviour surfaced):**
- `PUT /assets/videos/{id}/reviews/{reviewId}` → contract T1, hook `useUpdateReviewMutation` T4, UI edit form T7a/T7c. ✅
- `DELETE /assets/videos/{id}/reviews/{reviewId}` → contract T1, hook `useDeleteReviewMutation` T4, UI delete + `ZConfirmDialog` T7c. ✅
- `POST /reviews/enhance` → contract T2, hook `useEnhanceReviewTextMutation` T4, UI Sparkles in composer + edit form, success/fail toast T7. ✅
- `POST /assets/{id}/finalize` → contract T2, hook `useFinalizeAssetMutation` T5, UI "Mark reviewed" + confirm + unreviewed-parts guard T7c. ✅
- Permission gates mirror web exactly: edit `reviews:edit && !finalized`, delete `reviews:delete && !finalized`, enhance gated by `canEdit` (`reviews:edit`), finalize `assets:finalize && !finalized`. ✅
- Backend 403-on-completed and author-only are reflected by gating actions client-side on `!isFinalized` and surfacing server errors via inline banner/toast (no client-side author check needed — server enforces; client shows the failure). ✅

**Placeholder scan:** No "TBD"/"add validation"/"handle edge cases"/"similar to Task N". Every snippet is real RN/TS/YAML, including the replies-collapse toggle (full impl in T7c — no deferral). Every referenced symbol is defined: `Putter`/`Deleter`/`Poster`/`Invalidator` (T4/T5), `UpdateReviewInput` (T4), `ReviewItemProps`/`ReviewComposerProps` extensions (T7a/T7b), `ReviewsSectionProps` extension (T7c), `collapsed`/`toggleThread` (T7c), `hasUnreviewedParts`/`isFinalized`/`canEdit`/`canDelete`/`canFinalize` (T7c). i18n: `videos.confirmDeleteCommentTitle` added in T6; the replies-plural is fixed in T6 by adding i18next `reply_one`/`reply_other` (the flat `reply.one`/`reply.other` are unreachable by mobile i18next); failure copy uses specific keys (`videos.reviewUpdateFailed`/`videos.commentDeleteFailed`/`videos.markReviewedFailed`), not the generic `phase4.commentsFailed`. **Cross-plan dep:** `formatRelativeTime` is consumed from WP-UI0's `mobile/src/lib/datetime.ts` (not re-defined locally).

**Type/name consistency:**
- Hook return shapes match the contract: update returns `UpdateReviewResponse {id, content, created_at}` (the slim shape the Go handler actually sends — see T1 note), delete returns `void` (204), enhance returns `string` (the unwrapped `enhanced_text`), finalize returns `FinalizeAssetResponse {status}`.
- Test call-arg assertions match impl exactly: `PUT('/assets/videos/{id}/reviews/{reviewId}', { params: { path: { id, reviewId } }, body: { content } })`; `DELETE` same path with `params` only; `POST('/reviews/enhance', { body: { text } })`; `POST('/assets/{id}/finalize', { params: { path: { id } } })`.
- Invalidation keys: review update/delete invalidate `['reviews', videoId]` + `['assets']` (matches `useCreateReviewMutation`); finalize invalidates `['assets', assetId]` + `['assets']`.
- Injectable client/qc defaults (`= api`, `= queryClient`) and the `(client as typeof api)` cast match the existing hooks' pattern verbatim.
- `ZConfirmDialog` props used (`visible`, `title`, `description`, `tone`, `confirmLabel`, `cancelLabel`, `confirmOnly`, `confirmDisabled`, `onConfirm`, `onCancel`, `testID`) all exist (verified in `z-confirm-dialog.tsx`). `showToast(title, message, tone)` signature verified in `z-toast.tsx`. `ZButton` props (`label`, `onPress`, `variant`, `disabled`, `loading`, `icon`, `testID`) verified in `z-button.tsx`.

**Risks / open items flagged in-line:** (1) `colors.onPrimary` fallback to `colors.bg` if absent; (2) `ChevronDown`/`ChevronRight` are imported in `asset/[id].tsx` only (the toggle's real home — T7c), NOT in `review-item.tsx`; (3) `ZButton` import in `review-composer.tsx` droppable if unused; (4) `assets.test.tsx` may need the `wrapper`/mock header copied from `reviews.test.tsx`. Each has an explicit instruction. (5) The `sync:i18n` destructiveness re-add step (T6) is the standard repo hazard — diff-and-restore instruction included. (6) **Cross-plan ordering:** WP-UI0 must land `mobile/src/lib/datetime.ts` (the `formatRelativeTime(iso, t)` extraction) before T7; if WP-UI0 is not yet merged when T7 runs, perform the pure extraction first per the WP-UI0 dependency note near the top — do not fork a second formatter.
