# Resolution

## Summary
Asset and review access now applies object-level visibility in addition to existing role permissions.

## Technical Details
- Replaced the global asset list query with `ListVisibleAssets`, scoped by uploader for students and group membership for experts and administrators.
- Added `GetVisibleAsset` for asset details so non-visible assets return `404`.
- Added `CheckVideoVisibleToUser` and enforced it before listing, creating, updating, or deleting reviews for a video.
- Enforced asset visibility before finalization, in addition to the existing `assets:finalize` permission.
- Updated review update/delete queries to include `video_id`, preventing a review ID from being modified through a different video route.
- Regenerated SQLC output and the database Querier mock.
- Added unit tests for asset visibility scope and review visibility denial.

## Verification
- [x] Build passed: `make api:build`
- [x] Unit tests passed: `make test:unit`
- [x] Verified through API handler unit tests

## Tests
Automated tests were added and updated:

- `internal/assets/handler_test.go`
- `internal/reviews/handler_test.go`

## Next Steps
No follow-up task is required.
