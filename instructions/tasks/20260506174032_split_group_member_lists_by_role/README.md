# Task: Split Group Member Lists by Role

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
The group details page currently shows a single members table with a role column. The page must present group members as two distinct lists:

- Students.
- Experts, including administrators.

The role column must no longer be displayed in either list.

## Permissions
This change introduces `groups:expert-list:read` in `internal/permissions/permissions.go`.

- `groups:user-list:read` authorizes the students list only.
- `groups:expert-list:read` authorizes the experts and administrators list.
- Expert and administrator roles should have both permissions in WorkOS.
- Student roles should have only `groups:expert-list:read`.

Backend enforcement is required on the list handlers. Frontend permission checks must only control presentation.

## Context
- `internal/users/handler.go`
- `internal/permissions/permissions.go`
- `web/dashboard/src/app/pages/group-details-page/group-details-page.component.*`
- `web/dashboard/src/app/shared/components/users-list/users-list.component.*`
- `web/dashboard/src/app/shared/services/users.service.ts`
- `web/dashboard/src/app/shared/services/permissions.service.ts`

## Test Assessment
Automated tests are required because this changes access-control behavior and server-side filtering. Existing user handler tests should be updated, and coverage should be added for the new experts endpoint and permission.

## Loading State Assessment
The dashboard change touches asynchronous list loading. The existing Taiga UI skeleton placeholder pattern remains in use, and no visible loading-status text should be added.

## Acceptance Criteria
- [x] The group details page shows separate Students and Experts sections when permitted.
- [x] The role column is not displayed in either table.
- [x] `groups:user-list:read` only authorizes the students list.
- [x] `groups:expert-list:read` only authorizes the experts and administrators list.
- [x] Students can see the experts list but not the students list when they only have `groups:expert-list:read`.
- [x] Experts and administrators can see both lists when they have both permissions.
- [x] Backend tests cover filtering and permission enforcement.
