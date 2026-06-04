# Task: threaded_video_comments

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
Add single-level reply threads to video comments. Any comment can be replied to; replies are grouped and indented under the root comment with a left connector line. Author identity (name + avatar) is shown on all comments via a normalised join to `user_preferences` — no data is duplicated per comment row.

## Context
- Design handoff: `docs/handoffs/design_handoff_comment_threads/`
- Implementation plan: `docs/superpowers/plans/2026-06-04-threaded-video-comments.md`
- Affected tables: `video_reviews` (new `parent_id`, `author_id`), `user_preferences` (new `first_name`, `last_name`)
- Affected backend: `internal/reviews/handler.go`, `internal/auth/handler.go`, `db/queries/`
- Affected frontend: `videos.store.ts`, `video-details-page.component.ts`, `assets-api.service.ts`, i18n files

## Acceptance Criteria
- [ ] A comment can be replied to; the reply appears indented under it with a left connector line and smaller avatar
- [ ] Replies to replies still attach to the same root (one level only)
- [ ] Threads with replies show a working collapse toggle (default expanded); count label pluralises correctly
- [ ] New root comments still come from the bottom composer; replies never send a `timestamp_seconds`
- [ ] Author name and avatar appear on all comments (legacy comments show fallback "Unbekannt")
- [ ] `make api:build` and `make test:unit` pass
- [ ] `make web-next:build` and `make web-next:test` pass
