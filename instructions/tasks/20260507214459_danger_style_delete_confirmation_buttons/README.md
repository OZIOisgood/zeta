# Task: danger style delete confirmation buttons

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
As a dashboard user, I want destructive confirmation dialog actions to use the danger button appearance consistently, so that deleting comments, schedule configuration, blocked dates, group membership, and groups has a clear visual warning.

## Permissions

This is a dashboard presentation change. No permissions are added or changed.

## Context
- `web/dashboard/src/app/pages/asset-details-page/asset-details-page.component.ts`
- `web/dashboard/src/app/pages/manage-availability-page/manage-availability-page.component.ts`
- `web/dashboard/src/app/pages/group-preferences-page/group-preferences-page.component.ts`
- `web/dashboard/src/app/shared/components/group-preferences-dialog/group-preferences-dialog.component.ts`
- `web/dashboard/src/app/shared/components/users-list/users-list.component.ts`
- Taiga UI `TUI_CONFIRM` confirmation dialog data.

## Test Assessment

This change only adjusts declarative Taiga UI button appearance values. No automated unit tests are required because no business logic, data transformation, or API contract changes are introduced. The dashboard build is required to verify TypeScript and template validity.

## Loading State Assessment

This change does not introduce or modify asynchronous content loading behavior. Existing loading states remain unchanged.

## Acceptance Criteria
- [x] Delete confirmation dialog primary actions use `appearance: 'destructive'`.
- [x] The group delete confirmation uses the same destructive appearance as the visible Delete Group button.
- [x] Non-destructive confirmation dialogs keep their existing appearances.
- [x] The dashboard build passes.
