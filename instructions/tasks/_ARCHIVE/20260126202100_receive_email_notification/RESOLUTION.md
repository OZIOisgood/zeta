# Resolution

## Summary

Integrated Resend for email notifications when a new asset is uploaded to a group.

## Technical Details

- Implemented `internal/email` package using `github.com/resend/resend-go/v2`.
- Updated `internal/assets/handler.go`:
  - Injected `email.Service` into `Handler`.
  - Added email notification logic in `CreateAsset`.
  - Added logic to fetch Group Owner email using WorkOS `usermanagement`.
  - Added feature flag checks: `emails--receive` and `emails--new-asset-to-review`.
- Updated `internal/api/server.go` to initialize `email.Service` and wire it up.
- Added `GetGroup` query to `db/queries/groups.sql` and regenerated sqlc code.
- Updated `README.md` and `.env.example` with Resend configuration and new feature flags.
- Updated `instructions/CONSTITUTION.md` with Resend documentation link.

## Verification

- [x] Build passed (`make api:build`)
- [x] Sqlc generated (`sqlc generate`)
