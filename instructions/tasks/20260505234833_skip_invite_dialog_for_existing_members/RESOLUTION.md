# Resolution

## Summary
- Updated invitation lookup to report whether the current authenticated user already belongs to the invited group.
- Updated invitation acceptance to return the group immediately for existing members instead of inserting duplicate membership.
- Updated the groups page to skip the acceptance dialog and navigate directly to the group details page for existing members.
- Updated the root README invitation flow documentation.

## Technical Details
- `GET /groups/invitations/{code}` now requires an authenticated user context, checks membership with `CheckUserGroup`, and returns `group_id` plus `already_member`.
- `POST /groups/invitations/accept` checks membership before insertion and returns `200 OK` with the group ID if the user is already a member.
- The Angular `InvitationInfo` interface now includes `group_id` and `already_member`.
- `GroupsPageComponent` uses the existing invitation dialog only for non-members.
- Added invitation handler tests for existing-member lookup and idempotent acceptance.

## Verification
- [x] `go test ./internal/invitations -count=1`
- [x] `go test ./... -count=1`
- [x] `make api:build`
- [x] `make web:build`

## Tests
- Updated `internal/invitations/handler_test.go`.

## Next Steps
- No follow-up tasks are required.
