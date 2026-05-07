# Task: align dialog actions right

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
As a dashboard user, I want dialog action buttons to be aligned to the right, with the primary or destructive action placed at the far right, so that confirmation and form dialogs follow a consistent action hierarchy.

The change applies to custom dashboard dialogs used across pages and shared components.

## Permissions

This is a dashboard presentation change. No permissions are added or changed.

## Context
- `web/dashboard/src/app/shared/components/invite-dialog/`
- `web/dashboard/src/app/shared/components/accept-invite-dialog/`
- `web/dashboard/src/app/shared/components/group-preferences-dialog/`
- `web/dashboard/src/app/pages/my-sessions-page/ui/cancel-session-dialog/`
- `web/dashboard/src/app/pages/manage-availability-page/ui/*-dialog/`

## Test Assessment

This change is visual and declarative. No business logic or data transformation is introduced, so automated unit tests are not required. The dashboard build is required to verify template validity.

## Loading State Assessment

This change does not introduce or modify asynchronous content loading behavior. Existing skeleton placeholders remain unchanged.

## Acceptance Criteria
- [x] Dialog action rows are aligned to the right.
- [x] Primary and destructive main actions are the rightmost button in their action row.
- [x] Secondary cancel, decline, or keep actions remain secondary and are placed before the main action.
- [x] The dashboard build passes.
