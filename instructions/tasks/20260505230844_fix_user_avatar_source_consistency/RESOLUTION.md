# Resolution

## Summary
- Updated group user list responses to return `avatar` from `user_preferences.avatar` instead of WorkOS `profile_picture_url`.
- Updated coaching user resolution so expert and participant avatar data also comes from local user preferences.
- Updated dashboard user list rendering to consume the `avatar` field as base64 image data.
- Tightened avatar helpers in the navbar, preferences dialog, and coaching booking page to avoid treating HTTP URLs as valid display avatar values.

## Technical Details
- WorkOS remains the source for identity fields such as name, email, and organization role.
- `user_preferences.avatar` remains the source of truth for display avatars. Missing preferences rows are tolerated and produce no avatar so the UI can fall back to initials or a default icon.
- Added backend regression tests that provide a conflicting WorkOS profile image URL and local preference avatar, then assert that the local avatar is returned.

## Verification
- [x] Ran `go test ./internal/users ./internal/coaching -count=1`.
- [x] Ran `make test:unit`.
- [x] Ran `make api:build`.
- [x] Ran `make web:build`.
- [x] Checked source references for remaining user display avatar usage of WorkOS profile image URLs.

## Tests
- Added `internal/users/handler_test.go` coverage for the group users avatar source and missing preference fallback.
- Added `internal/coaching/users_test.go` coverage for coaching user avatar resolution.

## Next Steps
- None.
