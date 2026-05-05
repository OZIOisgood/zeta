# Resolution

## Summary
- Implemented generic group invitations that can be created without an email address.
- Email-less invitations remain pending after acceptance, which allows the same link or QR code to be used by multiple users.
- Updated the dashboard invitation dialog to make email optional and present link-first invitation copy.
- Updated the root README to document reusable invitation links and QR codes.

## Technical Details
- Added a migration to allow `group_invitations.email` to be `NULL`.
- Regenerated sqlc models so invitation email is represented as `pgtype.Text`.
- The invitation API now trims and validates non-empty email addresses, sends email only when an address is provided, and uses the web invitation URL for generated links.
- Email-specific invitations keep the existing single-use behavior and inviter acceptance notification.
- Generic link/QR invitations do not send invite emails and do not send acceptance emails for every join, avoiding repeated notifications from shared links.
- Email service logs now record recipient counts instead of full email addresses.
- Added Go tests covering email-less creation and reusable generic invitation acceptance.

## Verification
- [x] `go test ./internal/invitations -count=1`
- [x] `go test ./... -count=1`
- [x] `make api:build`
- [x] `make web:build`

## Tests
- Added `internal/invitations/handler_test.go` for the new backend behavior.

## Next Steps
- No follow-up tasks are required.
