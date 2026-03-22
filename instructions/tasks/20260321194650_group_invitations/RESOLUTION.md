# Resolution

## Summary

Implemented a full group invitation system allowing admins and experts to invite users to groups via email. Includes invite creation, email delivery, a confirmation dialog for authenticated users, and `localStorage`-based redirect preservation for unauthenticated users.

## Technical Details

### Backend

- **Database migration** (`20260125000000_create_groups.up.sql`): Added `invitation_status` enum type (`pending`, `accepted`) and `group_invitations` table with columns: `id`, `group_id`, `inviter_id`, `email`, `code` (unique), `status`, `created_at`.
- **SQLC queries** (`db/queries/groups.sql`): Added `CreateGroupInvitation`, `GetGroupInvitationByCode`, `UpdateGroupInvitationStatus` using named parameters for enum casting.
- **Invitations handler** (`internal/invitations/handler.go`): Three endpoints:
  - `POST /groups/{groupID}/invitations` — validates permission and group membership, generates a cryptographically random 6-character code, creates the invitation, sends email asynchronously via Resend.
  - `GET /groups/invitations/{code}` — returns invitation info (code, group name, group avatar) for the confirmation dialog.
  - `POST /groups/invitations/accept` — validates pending status, adds user to group, marks invitation as accepted.
- **Permissions** (`internal/permissions/permissions.go`): Added `groups:invites:create` to admin and expert roles.
- **Auth redirect** (`internal/auth/handler.go`): Login and Callback handlers remain simple — no redirect logic on the backend. Redirect preservation is handled entirely client-side via `localStorage`.

### Frontend

- **Invitations service** (`invitations.service.ts`): HTTP client methods for `create`, `getInfo`, and `accept`.
- **Invite dialog** (`invite-dialog/`): Email input dialog opened from the group details page.
- **Accept invite dialog** (`accept-invite-dialog/`): Confirmation dialog showing group name and avatar with Join/Decline buttons.
- **Groups page** (`groups-page.component.ts`): Detects `?invite=CODE` query param, fetches invitation info, shows confirmation dialog, navigates to group on accept.
- **Group details page**: Added "Invite User" button (visible with `groups:invites:create` permission) that opens the invite dialog.
- **Bootstrap redirect preservation** (`main.ts`): Saves the initial URL path to `localStorage` (with 5-minute expiry) **before Angular bootstraps**, ensuring route guards cannot redirect away before the path is captured.
- **Auth service** (`auth.service.ts`): `login()` redirects to WorkOS. `consumeRedirectPath()` reads, validates, and removes the saved path from `localStorage` after login.
- **Shell component** (`shell.component.ts`): After authentication, consumes the pending redirect path and navigates there via `setTimeout` (to escape the Angular effect context).

## Verification

- [x] `make api:build` passed.
- [x] `make web:build` passed.
