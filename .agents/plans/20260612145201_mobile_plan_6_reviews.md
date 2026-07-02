# Mobile Plan 6: Reviews — Timestamped Feedback on the Detail Screen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The asset detail screen shows the active video part's reviews (threaded, with tappable timestamps that seek the player) and lets users with `reviews:create` write comments — optionally anchored to the current player position — and reply to existing feedback.

**Architecture:** Contract grows by `GET/POST /assets/videos/{id}/reviews`. A reviews query + create-mutation pair joins `src/api/queries/`. The detail screen gets a reviews section below the player for the ACTIVE part: `ReviewItem` (author, relative/absolute time, optional timestamp chip → seeks the player, reply action) rendered as one-level threads, plus `ReviewComposer` (ZTextarea + send, optional "at current time" chip) gated on the `reviews:create` permission. Player seeking is wired by lifting an `expo-video` player ref out of the existing `Player` child via an `onPlayer` callback. Edit/delete/LLM-enhance stay web-only for now.

**Design rules:** `mobile/AGENTS.md` Design Rules are BINDING — every screen content inside `ZScreen`, UI only from `z-*` primitives (`z-chip`, `z-icon-button`, `z-textarea`, `z-text-input` now exist), colors via tokens, skeletons for async content, i18n only with existing en+de+fr keys, web `web/dashboard-next` is the design reference (see its review thread UI for hierarchy/copy).

**Parent spec:** `.agents/plans/20260611225227_mobile_app_react_native_expo_design.md`
**Predecessors:** Plans 1–5 + design-guardrails work on `feat/mobile-token-auth` (PR #15 — single-PR strategy; everything stays on this branch, no intermediate merges).

**Conventions:** identical to Plans 2–5 (wsl.exe shell wrapper, UNC file access, RNTL 14 async render, tests NEVER under `src/app/`, per-task gates `test`/`tsc`/`lint` green, Conventional Commits, no `Co-Authored-By`).

---

## Backend source of truth (verified)

`internal/reviews/handler.go` (routes mounted at `/assets/videos`, behind RequireAuth):
- `GET /assets/videos/{id}/reviews` → `Review[]` — requires `reviews:read` (403) + video visibility (404). Review: `{id, content, timestamp_seconds?(int32), parent_id?, author?{name, avatar?}, created_at(time)}`.
- `POST /assets/videos/{id}/reviews` — requires `reviews:create` (403) + visibility; body `{content, timestamp_seconds?, parent_id?}` → created `Review`.
- PUT/DELETE/{reviewId} + `/reviews/enhance` exist but are OUT OF SCOPE.
- Read the handler for exact status codes (400 invalid id, 401, 403, 404) before writing the contract.

## File Structure (end state)

```
docs/openapi.yaml                              + the two review operations + Review/ReviewAuthor/CreateReviewRequest schemas
mobile/src/api/schema.d.ts                     regenerated
mobile/src/api/queries/reviews.ts              useReviewsQuery, useCreateReviewMutation (+test)
mobile/src/components/review-item.tsx          threaded item w/ timestamp chip + reply (+test)
mobile/src/components/review-composer.tsx      ZTextarea + send + at-current-time chip (+test)
mobile/src/app/asset/[id].tsx                  reviews section + player seek wiring
mobile/src/__tests__/asset-detail.test.tsx     extended
```

---

### Task 1: Contract — review endpoints

- [ ] Read `internal/reviews/handler.go` (ListReviews/CreateReview: param name is `{id}` = VIDEO id; verify status codes). Extend `docs/openapi.yaml`: path `/assets/videos/{id}/reviews` with `get` (operationId `listVideoReviews`, 200 array of Review, 400/401/403/404) and `post` (operationId `createVideoReview`, requestBody CreateReviewRequest, 200/201 per handler, 400/401/403/404); schemas:

```yaml
    ReviewAuthor:
      type: object
      properties:
        name:
          type: string
        avatar:
          type: string
          description: Base64-encoded avatar; omitted when unset
      required: [name]
    Review:
      type: object
      properties:
        id:
          type: string
        content:
          type: string
        timestamp_seconds:
          type: integer
          format: int32
          description: Player position the comment refers to; omitted for untimed comments
        parent_id:
          type: string
          description: Present on replies
        author:
          $ref: "#/components/schemas/ReviewAuthor"
        created_at:
          type: string
          format: date-time
      required: [id, content, created_at]
    CreateReviewRequest:
      type: object
      properties:
        content:
          type: string
        timestamp_seconds:
          type: integer
          format: int32
        parent_id:
          type: string
      required: [content]
```

(Verify the POST success status the handler actually writes — adjust the spec to match reality, not the other way around.)
- [ ] `bash -ic "make api:openapi:lint"` (0 errors) → `cd mobile && pnpm run generate:api` → mobile suite green → commit `feat(api): add video review endpoints to the contract` (only openapi.yaml + schema.d.ts).

### Task 2: Reviews hooks (TDD)

- [ ] `mobile/src/api/queries/reviews.ts` mirroring `assets.ts`/`groups.ts` conventions: `Review` type export; `useReviewsQuery(videoId, client = api)` — queryKey `['reviews', videoId]`, `enabled: videoId !== ''`, GET with `params: { path: { id: videoId } }`; `useCreateReviewMutation(videoId, client = api)` — `useMutation` POSTing `{content, timestamp_seconds?, parent_id?}`, on success `queryClient.invalidateQueries({ queryKey: ['reviews', videoId] })` (import the shared singleton) and also invalidate `['assets']` (review counts change).
- [ ] Tests (`reviews.test.tsx`, hoisted QueryClient + gcTime 0 + clear teardown, async renderHook): list success, list error, mutation posts the body and invalidates (spy on a passed-in queryClient? The mutation uses the SHARED singleton — refactor for testability: accept optional `qc` param defaulting to the singleton, mirroring the `client` injection pattern). 4 tests.
- [ ] Gates green → commit `feat(mobile): add review query and create mutation`.

### Task 3: Review UI components (TDD)

- [ ] `review-item.tsx`: props `{ review, onSeek?: (seconds: number) => void, onReply?: (review) => void, isReply?: boolean }`. Layout per the web reference (check `web/dashboard-next` review thread component for hierarchy/copy before building): author name (fallback to a neutral label when `author` missing), relative created-at (use `Intl`/simple formatter — no new dependency), content, optional timestamp `ZChip` labeled `mm:ss` calling `onSeek(timestamp_seconds)`, reply affordance via `ZIconButton` (lucide `Reply`) when `onReply` given and `!isReply` (one-level threads). Replies render indented (`pl-8`).
- [ ] `review-composer.tsx`: props `{ onSubmit: (input: {content, timestampSeconds?, parentId?}) => Promise<void> | void, getCurrentTime?: () => number, replyingTo?: Review | null, onCancelReply?: () => void }`. ZTextarea + send ZIconButton (disabled while empty/busy); when `getCurrentTime` present and not replying: a toggle ZChip "at mm:ss" capturing the time at toggle-on; replying state shows who is being answered + cancel.
- [ ] Tests: item (renders content/author, seek chip fires with seconds, reply fires, reply-items hide the reply affordance), composer (submit passes content + captured timestamp, disabled when empty, reply mode passes parentId, cancel works). Use existing test conventions; i18n init where components translate.
- [ ] Gates green → commit `feat(mobile): add review item and composer components`.

### Task 4: Detail-screen integration

- [ ] `asset/[id].tsx`: extend the `Player` child with `onPlayer?: (player) => void` (call once after `useVideoPlayer`); parent keeps `playerRef = useRef<VideoPlayer | null>(null)`. Seek: `playerRef.current.currentTime = seconds` (+ `play()` if paused — check the expo-video API for the exact property; adapt). `getCurrentTime` reads `playerRef.current?.currentTime ?? 0`.
- [ ] Reviews section below the metadata for the ACTIVE part: `useReviewsQuery(active?.id ?? '')`; thread the flat list client-side (top-level = no parent_id, replies grouped under their parent, both sorted by created_at ascending); states: skeleton rows while pending, small empty hint, inline error + retry (existing patterns). Composer at the bottom — rendered only when `useAuth` permissions include `reviews:create`; submit via `useCreateReviewMutation(active.id)`; reply state local.
- [ ] Part switching: the query key follows `active.id` — verify switching parts swaps the review list (no stale cache bleed).
- [ ] Extend `src/__tests__/asset-detail.test.tsx`: reviews render under the player (mock the query), timestamp chip seek calls through (mock player via the onPlayer callback), composer hidden without permission, visible with it. Keep existing assertions intact.
- [ ] Gates green + `expo export` (no new routes expected) → commit `feat(mobile): show and create timestamped reviews on the detail screen`.

### Task 5: i18n + docs + final verification

- [ ] Key lookup in `mobile/src/i18n/locales/en.json` (the dashboard HAS review UI — look for `reviews.*`/`videos.*` keys covering: comments heading, empty state, reply, cancel, send/comment, "at {time}" patterns); wire matches (en+de+fr) via `useTranslation`; list non-matches as dashboard follow-ups. NO invented keys.
- [ ] `mobile/README.md`: one Reviews paragraph. Root README: no architecture change (same API) — skip the diagram.
- [ ] Full battery: `bash -ic "make mobile:lint && make mobile:typecheck && make mobile:test && make api:openapi:lint"`, Go suite, expo export. All green.
- [ ] Commit `docs(mobile): document the reviews feature` → push branch → update PR #15 body (append Part 6).
- [ ] PR note: emulator screenshots of the detail screen are REQUIRED by the new review guideline — if no emulator is reachable from this session, add a checklist item "[ ] Screenshots: detail screen with reviews (pending manual run)" to the PR body instead of skipping silently.

---

## Out of Scope (follow-ups)

- Edit/delete own reviews; LLM enhance (`/reviews/enhance`).
- Deep-linking to a timestamped comment; push notifications on new reviews.
- Pagination (the web loads the full list too).

## Verification Checklist (end of plan)

- [ ] All mobile gates green (≥65 tests), export clean, contract idempotent, Go suite green
- [ ] Composer hidden without `reviews:create`; reviews list respects visibility errors (403/404 path tested at hook level)
- [ ] Seek-on-tap works against the lifted player ref (unit-tested via mock)
