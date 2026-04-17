# Task: Group Invitations

## Status

- [x] Defined
- [x] In Progress
- [x] Completed

## Description

As a user with the `groups:invites:create` permission (admin or expert) and member of a group, I want the ability to send invitations to users via email from the group details page.

### Invitation Flow

1. On the group details page, an "Invite User" button is displayed next to the "Users" header (visible only to users with `groups:invites:create` permission).
2. Clicking the button opens a dialog where the user enters an email address.
3. The backend generates a unique 6-character invite code and sends an email containing the invite link (`http://localhost:4200/groups?invite=<CODE>`).
4. When the recipient opens the link:
   - **Authenticated user**: A confirmation dialog is shown with the group name and avatar. The user can accept ("Join") or decline.
   - **Unauthenticated user**: The user is redirected to WorkOS login. After authentication, the browser redirects back to the original invite URL (preserved via the OAuth `state` parameter). The confirmation dialog is then displayed.
5. Upon acceptance, the user is added to the group and redirected to the group details page.

### Auth Redirect Preservation

The invite URL is preserved through the WorkOS authentication flow using `localStorage` and early path capture:

- In `main.ts`, **before Angular bootstraps**, the current path is saved to `localStorage` with a 5-minute expiry. This runs synchronously before any route guards can redirect away.
- After successful authentication, WorkOS redirects back to `http://localhost:4200`.
- The shell component detects the authenticated user, reads and consumes the saved path from `localStorage`, and navigates to the original invite page.

## Context

- **Backend**: `internal/invitations/handler.go` — invitation CRUD and acceptance logic.
- **Database**: `db/migrations/20260125000000_create_groups.up.sql` — `invitation_status` enum and `group_invitations` table.
- **Queries**: `db/queries/groups.sql` — `CreateGroupInvitation`, `GetGroupInvitationByCode`, `UpdateGroupInvitationStatus`.
- **Permissions**: `internal/permissions/permissions.go` — `groups:invites:create` assigned to admin and expert roles.
- **Auth handler**: `internal/auth/handler.go` — standard Login/Callback flow (no redirect logic; redirect is handled client-side).
- **Bootstrap**: `web/dashboard/src/main.ts` — captures initial path to `localStorage` before Angular bootstraps.
- **Frontend service**: `web/dashboard/src/app/shared/services/invitations.service.ts`
- **Invite dialog**: `web/dashboard/src/app/shared/components/invite-dialog/`
- **Accept dialog**: `web/dashboard/src/app/shared/components/accept-invite-dialog/`
- **Groups page**: `web/dashboard/src/app/pages/groups-page/groups-page.component.ts` — handles `?invite=CODE` query param.
- **Group details page**: `web/dashboard/src/app/pages/group-details-page/` — "Invite User" button.

## Acceptance Criteria

- [x] `group_invitations` table uses `invitation_status` enum (`pending`, `accepted`) instead of plain text.
- [x] `groups:invites:create` permission is created and assigned to `admin` and `expert` roles.
- [x] `POST /groups/{groupID}/invitations` creates an invitation and sends an email with the invite link.
- [x] `GET /groups/invitations/{code}` returns invitation info (group name, avatar) for the confirmation dialog.
- [x] `POST /groups/invitations/accept` accepts the invitation and adds the user to the group.
- [x] "Invite User" button is visible on the group details page for authorized users.
- [x] Authenticated users see a confirmation dialog with group name and avatar before joining.
- [x] Unauthenticated users are redirected to login, then back to the invite URL via `localStorage` redirect preservation.
- [x] `make api:build` passes.
- [x] `make web:build` passes.
