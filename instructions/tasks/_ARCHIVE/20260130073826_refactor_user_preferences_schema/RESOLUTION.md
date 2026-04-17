# Resolution

## Summary
Replaced the `users` table with `user_preferences`.
- Created partial migration to drop `users` and create `user_preferences`.
- Used postgres `ENUM` for language: `en`, `de`, `fr`.
- Updated Go handlers (`internal/auth/handler.go`) to combine WorkOS profile data with local preferences.
- Updated `README.md` schema diagram.

## Verification
- [x] Backend compiles (`go build ./cmd/api`).
- [x] Migrations applied successfully (`make infra:restart`).
- [x] Frontend code inspected (`preferences-dialog.component.ts` uses matching languages).

## Next Steps
- None.
