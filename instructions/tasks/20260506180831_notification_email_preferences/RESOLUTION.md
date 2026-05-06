# Resolution

## Summary
Implemented user-managed email notification preferences on the Preferences page.

## Technical Details
- Added email notification preference columns to `user_preferences`, including one master setting and per-category settings for asset uploads, asset reviews, invitation activity, group membership updates, coaching booking updates, and coaching reminders.
- Added sqlc queries for reading and updating email preferences, and regenerated the DB querier mock.
- Added a shared email preference helper used by account-owned notification senders.
- Updated `/auth/me` to return and update a nested `email_preferences` object.
- Added an Email Preferences tab to the dashboard Preferences page.
- The dashboard hides capability-specific email preferences from users who cannot receive those notification types, such as group-owner upload emails for users without `groups:create`.
- Kept explicit invitation delivery to an entered email address independent of recipient preferences because the recipient may not be an authenticated user.
- Updated the root README feature list, notification preference flow, and `user_preferences` schema documentation.

## Verification
- [x] Ran `make test:unit`.
- [x] Ran `make api:build`.
- [x] Ran `make web:build`.
- [x] Ran `git diff --check`.
- [x] Re-ran `make web:build` after capability-specific visibility updates.

## Tests
- Added unit coverage for the email preference gating helper.
- Added a coaching email test verifying that a disabled booking-update preference skips that recipient while still sending to an enabled recipient.

## Next Steps
- Apply the new migration in each environment before deploying the API and dashboard changes.
