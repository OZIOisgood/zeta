# Moderation Reports Plan

## Context

Ticket #18 asks whether reporting users/comments can be covered by the existing
feedback function. The current feedback inbox is a good delivery pattern
(Postgres first, Discord forum post second), but its data model is product
feedback with a 1-5 rating. Abuse/moderation reports should be a separate
workflow so admins can triage them, link them to comments/users, and avoid mixing
moderation data with general feedback.

Recommendation: build a small moderation-reporting feature with:

- a report action on video review comments via the existing comment kebab menu;
- a new admin-only `/admin/reports` dashboard page;
- Discord forum mirroring for operational awareness;
- WorkOS-backed permissions for report creation and admin triage.

## Naming Decision

Use `moderation` as the feature namespace, not `reports`.

Reason: `reports:read` already exists for user/expert activity reports under
`/reports/experts` and `/reports/students`. Reusing `reports:*` for abuse reports
would create confusing authorization and UI semantics.

Proposed permissions:

- `moderation:reports:create` - active authenticated users can create reports.
- `moderation:reports:read` - admins can view the admin report queue.
- `moderation:reports:update` - admins can change status/resolution notes.

Assign `moderation:reports:create` to `admin`, `expert`, and `student`.
Assign read/update only to `admin`.

During implementation, create/update these permissions through the WorkOS
Authorization API using the target environment's `.env` `WORKOS_API_KEY`, then
add them to the intended roles with additive role-permission calls and verify
live assignments. Do this for dev and prod before relying on JWT permissions.

## Backend Scope

1. Add reversible migrations for `moderation_reports`.
   Proposed columns:
   - `id uuid primary key default gen_random_uuid()`
   - `reporter_user_id text not null`
   - `reporter_display_name text not null`
   - `subject_type text not null check in ('review_comment', 'user')`
   - `target_review_id uuid references video_reviews(id) on delete set null`
   - `target_video_id uuid references videos(id) on delete set null`
   - `target_user_id text not null default ''`
   - `target_display_name text not null default ''`
   - `reason text not null`
   - `details text not null default ''`
   - `page_url text not null default ''`
   - `user_agent text not null default ''`
   - `status text not null default 'open' check in ('open', 'reviewing', 'resolved', 'dismissed')`
   - `resolution_note text not null default ''`
   - `resolved_by_user_id text not null default ''`
   - `resolved_at timestamptz`
   - `discord_status text not null default 'pending' check in ('pending', 'posted', 'failed', 'skipped')`
   - `discord_channel_id text not null default ''`
   - `discord_thread_id text not null default ''`
   - `discord_message_id text not null default ''`
   - `discord_error text not null default ''`
   - `created_at timestamptz not null default now()`
   - `updated_at timestamptz not null default now()`
2. Add indexes for admin queue and target lookup:
   - `(status, created_at desc)`
   - `(target_review_id)`
   - `(target_user_id, created_at desc)`
   - `(reporter_user_id, created_at desc)`
3. Add sqlc queries under `db/queries/moderation_reports.sql`:
   - create report;
   - list reports for admin with filters/pagination;
   - get report by ID;
   - update status/resolution;
   - mark Discord posted/failed/skipped.
4. Add `internal/moderation` handler/service:
   - `POST /moderation/reports`
   - `GET /moderation/reports`
   - `PATCH /moderation/reports/{id}`
5. Creation validation:
   - require `moderation:reports:create`;
   - require active account via the existing protected route group;
   - accept `subject_type`, `video_id`, `review_id`, `reason`, `details`, `page_url`;
   - for comment/user reports from comments, derive target comment/user from
     `video_id + review_id` server-side;
   - verify the reporter can see the video using the existing visibility logic
     or a shared query equivalent to `CheckVideoVisibleToUser`;
   - reject cross-video review IDs and self-reports only if product wants that
     behavior. Default: allow self-report of a comment because it may be used to
     request moderation/cleanup.
6. Admin listing/update validation:
   - require `moderation:reports:read` for list/detail;
   - require `moderation:reports:update` for status changes;
   - do not expose raw emails or unnecessary PII.
7. Discord delivery:
   - reuse the existing `discord.Poster` client and feedback delivery pattern;
   - DB insert succeeds even if Discord post fails;
   - store Discord thread/message IDs and failure state on the report row;
   - title examples: `[open] comment report from {reporter}` or
     `[open] user report from {reporter}`;
   - content should include report ID, subject type, reporter ID/display name,
     target user ID/display name if available, video/comment IDs, reason,
     details, and page URL.
8. Logging:
   - stable events such as `moderation_report_created`,
     `moderation_report_discord_post_failed`, `moderation_report_updated`;
   - include `component=moderation`, report ID, target IDs, status, and `err`;
   - do not log report details, cookies, tokens, or full email addresses.

## Frontend Scope

1. Extend `z-comment-actions` to optionally show a `Report` action.
   - Keep edit/delete behavior unchanged.
   - Use a lucide icon such as `Flag`.
   - The option should appear when the user has `moderation:reports:create`.
2. In `VideoDetailsPageComponent`, wire top-level comments and replies to open a
   report dialog from the existing three-dot menu.
3. Add a compact report dialog using existing shared UI primitives.
   - subject choice: comment or user;
   - reason select: harassment, spam, inappropriate content, other;
   - optional details textarea;
   - submit/cancel disabled states;
   - success/error toast.
4. Add a `ModerationReportsApiClient` under `core/http`.
5. Add `/admin` route behavior:
   - redirect `/admin` to `/admin/reports`;
   - add `/admin/reports` guarded by `moderation:reports:read`;
   - add a nav item only visible to admins with that permission.
6. Add `AdminReportsPageComponent`:
   - dense dashboard table/list with status, subject, reporter, target, created
     time, Discord status, and actions;
   - filters for status and subject type;
   - skeleton loading, empty, error, narrow-screen layout;
   - status update/resolution dialog or inline control for admins with
     `moderation:reports:update`.
7. Update frontend permission union/types and Transloco copy in all active
   dashboard locale files.

## Config And Infra Scope

If moderation reports should use a separate Discord forum, add:

- `DISCORD_MODERATION_REPORTS_FORUM_CHANNEL_ID`

Classification: plain runtime config, not a secret. The existing
`DISCORD_BOT_TOKEN` remains the secret payload used for posting.

Required parity surfaces:

- `.env.example`
- `.github/workflows/deploy-dev.yml`
- `.github/workflows/deploy-prod.yml`
- `docs/cicd.md`
- README Discord section

If product chooses to reuse the existing feedback forum temporarily, skip the new
env var and pass `DISCORD_FEEDBACK_FORUM_CHANNEL_ID` to the moderation handler
until a dedicated forum exists. Recommendation: create a dedicated moderation
forum for dev and prod because report contents are operationally different and
may be more sensitive than product feedback.

Before applying config changes, run the runtime config audit for the affected
variables and verify Cloud Run bindings after deploy with values redacted.

## Admin UX Recommendation

Build `/admin/reports` now, but keep the first version intentionally small:

- open/reviewing/resolved/dismissed queue;
- linked video/comment context;
- Discord delivery status;
- resolution note.

Do not build a broad admin console yet. Add an `/admin` shell/route namespace and
one page, leaving room for users, groups, audit, or config later.

## Verification

Backend:

- `make db:sqlc`
- focused Go tests for `internal/moderation`
- review visibility/permission tests for create/list/update
- `make api:build`
- `make test:unit` if time permits

Frontend:

- focused specs for comment report action/dialog
- route/permission guard specs for `/admin/reports`
- admin reports page loading/empty/error/status update tests
- `make web-next:lint`
- `make web-next:build`

Infra/permissions:

- WorkOS permission create/update and additive role assignment verification for
  dev/prod
- `git diff --check`
- YAML parse for changed workflows
- redacted Cloud Run env/secret binding verification after deploy

## Open Questions / Needed From Product

1. Dedicated Discord forum channel IDs:
   - dev numeric channel ID for moderation reports
   - prod numeric channel ID for moderation reports
2. Confirm whether reports should mirror into Discord only, email only, or both.
   Recommendation: Discord forum post only for phase 1. Email can create noisy
   duplicate alerts unless there is a clear escalation mailbox.
3. Confirm reason taxonomy and whether anonymous-to-admin reporting is desired.
   Recommendation: not anonymous to admins; show reporter identity in admin view.
4. Confirm whether admins need to delete/hide offending comments from the admin
   report page in phase 1. Recommendation: defer destructive moderation actions
   and first ship triage/status.
