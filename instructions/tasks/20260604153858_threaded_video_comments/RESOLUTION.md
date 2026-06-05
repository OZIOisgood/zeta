# Resolution: Threaded Video Comments

## What was built

Single-level reply threads on video comments, with author identity surfaced via a normalised `user_preferences` join.

### Backend
- **Migration** (`20260604160000`): Added `parent_id UUID` (self-FK, ON DELETE CASCADE) and `author_id TEXT` to `video_reviews`; added `first_name TEXT NOT NULL DEFAULT ''` and `last_name TEXT NOT NULL DEFAULT ''` to `user_preferences`.
- **SQL queries**: `CreateVideoReview` takes `parent_id` + `author_id`; `ListVideoReviews` LEFT JOINs `user_preferences` for author name/avatar; `GetVideoReview` used for parent validation; `UpdateUserName` added.
- **Handler** (`internal/reviews`): `CreateReview` validates parent (same video, re-roots nested replies to single level, strips timestamp from replies, captures author from JWT). `ListReviews` maps joined author fields.
- **Auth handler** (`internal/auth`): first-login preference seeding stores WorkOS first/last name, login updates existing local names, and `/auth/me` fails if the local name update cannot be persisted. `/auth/me` also keeps updating WorkOS names via the existing WorkOS update call.

### Frontend (`web/dashboard-next`)
- **API client**: `Review` extended with `parent_id?` and `author?: { name, avatar }`. `createReview` accepts `parentId?`.
- **Store**: `Thread` type exported; `threads` computed groups roots (sorted by `timestamp_seconds`) + replies (sorted by `created_at`). `createReview` strips timestamp for replies. `deleteReview` cascades reply removal in client state.
- **Date service**: `formatRelative` added with 30-day ceiling (falls back to absolute date).
- **i18n**: `videos.reply`, `videos.replyPlaceholder`, `videos.reply.one`, `videos.reply.other`, `videos.unknownAuthor` added to de/en/fr.
- **Component**: Flat comment list replaced with threaded layout — root comments with author/timestamp, collapsible reply threads (left connector line, smaller avatars), inline reply composer (Ctrl/Cmd+Enter support, auto-focus).

## Verification

- `make api:build` ✅
- `make test:unit` ✅
- `make web-next:build` ✅
- `make web-next:test` (57/57) ✅

## Key decisions

- Author identity is normalised: only `author_id` is stored per review row; name/avatar come from `user_preferences` via LEFT JOIN.
- Names sync from WorkOS on first login/login and from preferences updates via `UpdateUserName`; reviews with `author_id` require a local author profile, while legacy reviews without `author_id` can still show the UI fallback.
- Single-level threading enforced in the backend: replies-to-replies are re-rooted to the thread root.
- `formatRelative` falls back to absolute date format after 30 days to avoid "730 days ago" UX.
