# Task: fix user avatar source consistency

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
Group detail pages must display user avatars from `user_preferences.avatar`, not from the WorkOS `profile_picture_url` field. The local preference avatar is the application source of truth after initial sign-in seeding and after user preference updates.

## Context
- `internal/auth/handler.go` seeds a WorkOS profile image into `user_preferences.avatar` only on first sign-in, then treats the database value as authoritative.
- `internal/users/handler.go` returned `profile_picture_url` from WorkOS for the group users list.
- `internal/coaching/users.go` returned WorkOS profile image URLs for coaching expert and participant display data.
- `web/dashboard/src/app/shared/components/users-list/` rendered the group users list avatar directly from `profile_picture_url`.

## Permissions
No new permissions are required. The existing `groups:user-list:read` permission continues to guard the group users list.

## Test Assessment
Automated tests are required because the affected behavior combines WorkOS identity data with local preference data. Regression tests must verify that local avatars are preferred even when WorkOS returns a different profile picture URL.

## Acceptance Criteria
- [x] Group users API returns `avatar` from `user_preferences.avatar`.
- [x] Group users UI renders returned avatars as base64 image data.
- [x] Coaching user summaries use `user_preferences.avatar` for expert and participant avatars.
- [x] WorkOS profile image URLs are not used for user avatar display surfaces.
- [x] Backend unit tests cover the avatar source behavior.
