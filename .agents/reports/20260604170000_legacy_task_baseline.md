# Legacy Task Baseline

## Context

This report replaces the old task-folder history with a compact baseline of the latest known project state. The previous history included many incremental and superseded tasks, especially around the dashboard rewrite, so the useful record is the final state rather than every intermediate step.

## Current Product Baseline

- Zeta is a Go API plus Angular dashboard for remote video coaching.
- Users upload videos for expert review; backend code keeps the established `asset` parent model and `video` child media rows.
- User-facing copy should say video, video part, clip, or part instead of exposing asset terminology.
- WorkOS handles authentication and roles.
- Mux handles uploaded videos and imported live-session recordings.
- Agora handles live coaching calls and optional cloud recording.
- Resend sends templated transactional emails.

## Backend Baseline

- Go handlers depend on interfaces where practical: sqlc `db.Querier`, `email.Sender`, `llm.Enhancer`, WorkOS user-management wrapper, and Mux client wrapper.
- Generated mocks live under `internal/*/mocks`; `make mocks` refreshes them.
- Unit tests run with `make test:unit`; integration tests use the `integration` build tag and testcontainers.
- SQL lives in `db/queries`; migrations live in `db/migrations`; query or schema changes require `make db:sqlc`.
- Logging uses `log/slog` JSON output, injected loggers, request-scoped handler loggers, stable snake_case event names, `component`, and `err` on errors.
- Runtime config changes must keep `.env.example`, docs, and Terraform Cloud Run wiring aligned.

## Dashboard Baseline

- The active dashboard is `web/dashboard-next`.
- The old Taiga UI dashboard source was removed after the Phase 7 cutover.
- The folder remains named `web/dashboard-next` for branch coordination.
- CI and deployment workflows build the `zeta-dashboard` image from `web/dashboard-next`.
- Dashboard stack: Angular, Tailwind CSS, Angular Primitives, Transloco, NgRx Signal Store, Storybook, lucide-angular.
- Shared UI wrappers live under `web/dashboard-next/src/app/shared/ui`.
- Prefer existing `z-*` wrappers before raw `ng-primitives`.
- Async content loading uses skeletons or structured empty/error states, not visible loading text.

## Dashboard Feature Baseline

- Groups, group details, invitations, reusable QR/link invites, and role-separated student/expert member lists are present.
- Videos page supports expert review-status grouping: To review, In review, Reviewed.
- Upload, details, review comments, AI text enhancement, breadcrumbs, and group-linked video details are represented in the rewritten dashboard.
- Preferences supports personal data, avatar, language, timezone, and email notification settings.
- Page-level tabs use the shared Angular Primitives-backed tabs wrapper.
- Shared wrappers include button, icon button, checkbox, combobox, dialog, tabs, skeleton, toast, avatar, group card, and video preview patterns.

## Live Coaching Baseline

- Students can browse groups/experts/session types, choose local-date slots, book sessions, cancel eligible bookings, and join within the connect window.
- Experts can manage session types, recurring availability, and blocked slots.
- The full-screen video call route remains outside the normal application chrome.
- Agora call connection and optional recording lifecycle remain integrated.
- Stopped cloud recordings are queued for import, read from private GCS through signed URLs, imported into Mux, and converted into normal reviewable asset/video records when ready.
- Raw GCS recording files are retained until a formal retention policy exists.

## Email And Notification Baseline

- Transactional emails use embedded Go HTML templates, shared layout, CSS inlining, and text fallbacks.
- `make email:preview` renders local preview artifacts into `build/email-previews/`.
- Email copy is localized with embedded en/de/fr locale files through `go-i18n/v2`.
- Authenticated recipients use their stored language preference; external invitation recipients use `DEFAULT_LANGUAGE`.
- Users can disable all email notifications or individual categories where permissions make the category relevant.
- Explicit invitation sends to entered email addresses are not suppressed by recipient preferences because the recipient might not be an authenticated user.
- `RESEND_FROM_EMAIL` is required and wired for local and deployed environments.

## Superseded History Handling

- Dashboard rewrite Phase 7 supersedes earlier dashboard rewrite phase records.
- Phase 6 supersedes earlier preference, notification UI, shared tabs, shared cards, and email styling follow-ups.
- Phase 5 supersedes earlier live coaching dashboard surface notes.
- Later video terminology and review-status records supersede older copy/listing notes.
- Live coaching recording post-processing supersedes the earlier recording start/stop-only work.
- The old per-task folders are intentionally not copied forward one-for-one.

## Verification Snapshot

The historical final records report successful runs of:

- `make api:build`
- `make test:unit`
- `make web-next:build`
- `make web-next:test`
- `make web-next:storybook:build`
- `make email:preview`
- `docker build -q web/dashboard-next`
- `git diff --check`

This baseline is a documentation migration only; it does not re-run those checks.
