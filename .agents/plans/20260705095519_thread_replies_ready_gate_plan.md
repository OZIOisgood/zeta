## Context

Ticket #20 changes review-thread reply rules. Today `POST /assets/videos/{id}/reviews` rejects every create when the asset is `completed`, and the Angular detail page hides all composers on completed assets. That blocks students from replying after the expert marks the video reviewed, while allowing any user with `reviews:create` to reply before the review is ready.

## Decision

- Keep `reviews:create` as the permission for creating top-level review comments.
- Add `reviews:reply` as the base permission for replying to review threads after the asset is completed. This should be assigned to student, expert, and admin roles.
- Add `reviews:reply-before-ready` for replying before the asset is completed. This should be assigned to expert and admin roles, not students.
- Backend create rules:
  - top-level comments are allowed only before `completed`;
  - replies are allowed after `completed` for users with `reviews:reply`;
  - replies before `completed` require `reviews:reply` plus `reviews:reply-before-ready`.
- Frontend rules:
  - keep the bottom top-level comment composer hidden after completion;
  - show reply actions/composer after completion;
  - before completion, show reply actions only to users with `reviews:reply-before-ready`.

## Files To Touch

- `internal/permissions/permissions.go`
- `internal/reviews/handler.go`
- `internal/reviews/handler_test.go`
- `web/dashboard-next/src/app/core/permissions/permissions.service.ts`
- `web/dashboard-next/src/app/pages/video-details/video-details-page.component.ts`
- `web/dashboard-next/src/app/pages/video-details/video-details-page.component.spec.ts`

## Verification

- Run narrow Go tests for `internal/reviews`.
- Run the video details Angular spec if feasible.
- Run build/lint only if the narrow checks indicate broader risk.
