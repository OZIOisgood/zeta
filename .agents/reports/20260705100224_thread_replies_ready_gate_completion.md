## Context

Ticket #20 required review-thread replies to stay open after a video is marked reviewed, while preventing students from replying before the review is ready.

## Decision

- Added `reviews:reply` for thread replies after a video is marked reviewed.
- Added `reviews:reply-before-ready` for pre-ready thread replies by experts/admins.
- Kept `reviews:create` for top-level review comments.
- Backend now distinguishes top-level review comments from replies:
  - top-level comments remain blocked after `completed`;
  - replies are allowed after `completed` for users with `reviews:reply`;
  - replies before `completed` require `reviews:reply` plus `reviews:reply-before-ready`.
- Dashboard now gates reply buttons/composer separately from the bottom top-level comment composer.
- WorkOS was updated through additive role-permission calls: `admin`, `expert`, and `student` have `reviews:reply`; only `admin` and `expert` have `reviews:reply-before-ready`.

## Files Touched

- `.agents/plans/20260705095519_thread_replies_ready_gate_plan.md`
- `internal/permissions/permissions.go`
- `internal/reviews/handler.go`
- `internal/reviews/handler_test.go`
- `web/dashboard-next/src/app/core/permissions/permissions.service.ts`
- `web/dashboard-next/src/app/pages/video-details/video-details-page.component.ts`
- `web/dashboard-next/src/app/pages/video-details/video-details-page.component.spec.ts`

## Verification

- `go test ./internal/reviews -count=1`
- `make api:build`
- `pnpm exec ng test --watch=false --include src/app/pages/video-details/video-details-page.component.spec.ts`
- `make web-next:build`
- `make web-next:lint`

## Follow-Ups

- Existing sessions may need token refresh/re-login before the new WorkOS permission appears in JWT claims.
