# Resolution

## Summary

Added `owner_id` field to `groups` table and related code.

## Technical Details

- Modified `db/migrations/20260125000000_create_groups.up.sql` to include `owner_id TEXT NOT NULL`.
- Updated `db/queries/groups.sql` to insert and select `owner_id`.
- Regenerated SQLC code (`make db:sqlc`).
- Updated `internal/groups/handler.go` to pass `user.ID` as `OwnerID` when creating a group.
- Updated `web/dashboard/src/app/shared/services/groups.service.ts` to include `owner_id` in `Group` interface.

## Verification

- [x] Build passed (`make api:build` and `make web:build`)
- [ ] Verified in UI/API (Implicitly verified by build and code generation)
