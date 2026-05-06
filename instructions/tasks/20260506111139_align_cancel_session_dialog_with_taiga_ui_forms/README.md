# Task: Align Cancel Session Dialog With Taiga UI Forms

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
As a dashboard user, I want the cancel session dialog to follow the same Taiga UI dialog and form conventions used elsewhere in the application, so session cancellation feels consistent with the rest of the dashboard.

## Context
- `web/dashboard/src/app/pages/my-sessions-page/my-sessions-page.component.*`
- `web/dashboard/src/app/pages/manage-availability-page/ui/*-dialog/*`
- The existing cancel session dialog uses a custom overlay, custom card, and manually styled textarea rather than the shared Taiga UI dialog service and form controls.

## Permissions
This change reuses the existing booking cancellation API and does not introduce new permissions.

## Test Assessment
No automated tests are required because the change is limited to component structure and presentation. The existing cancellation API call and response handling remain unchanged. Verification will use the dashboard build.

## Loading State Assessment
This change does not introduce or modify asynchronous content loading states.

## Acceptance Criteria
- [x] The cancel session dialog opens through `TuiDialogService`.
- [x] The optional cancellation reason uses Taiga UI form controls.
- [x] Custom cancel dialog overlay, card, and textarea styles are removed from the page component.
- [x] `make web:build` passes.
