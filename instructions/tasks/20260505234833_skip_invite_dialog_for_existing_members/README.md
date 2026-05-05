# Task: Skip Invite Dialog for Existing Members

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
As an authenticated group member, I should not see an invitation acceptance dialog when opening an invitation link for a group that I already belong to. The application should take me directly to the group instead of asking me to join again.

## Permissions

No new permissions are required. Invitation lookup and acceptance remain available only to authenticated users through the protected groups route. Membership is checked with the existing `CheckUserGroup` query.

## Context
- The reusable QR-code invitation flow allows the same link to be opened by many users.
- Existing members can scan or open the same link, but the dashboard currently displays the "Group Invitation" dialog even though there is nothing to accept.
- The backend acceptance endpoint also attempts to insert duplicate membership if the dialog is accepted.
- Relevant files:
  - `internal/invitations/handler.go`
  - `internal/invitations/handler_test.go`
  - `web/dashboard/src/app/pages/groups-page/groups-page.component.ts`
  - `web/dashboard/src/app/shared/services/invitations.service.ts`

## Test Assessment

Automated tests must be updated because this changes backend invitation lookup and acceptance behavior for existing members. Frontend verification is covered by the Angular build for this small routing change.

## Acceptance Criteria
- [x] Invitation info response identifies when the current user is already a group member.
- [x] The groups page skips the acceptance dialog for existing members and navigates directly to the group page.
- [x] Accepting an invitation is idempotent for existing members and does not create duplicate membership.
- [x] Non-members still see the invitation dialog and can accept normally.
- [x] Root README documents the existing-member behavior.
- [x] Relevant Go tests pass.
- [x] `make api:build` passes.
- [x] `make web:build` passes.
