# Task: Make User Preferences a Separate Page

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
As an authenticated dashboard user, I want my preferences to open as a dedicated page rather than a dialog so that account settings follow the same navigation pattern as group preferences.

## Requirements
- Move the existing user preferences form into a standalone page.
- Use the existing group preferences page as the layout and interaction reference.
- Preserve support for editing first name, last name, language, timezone, and avatar.
- Update navbar preference actions to navigate to the page.
- Remove obsolete dialog code when it is no longer referenced.

## Permissions
This change does not introduce new permissions. The preferences page reuses the existing authenticated shell route behavior and the current `PUT /auth/me` update flow.

## Context
- `web/dashboard/src/app/pages/group-preferences-page/`
- `web/dashboard/src/app/shared/components/preferences-dialog/`
- `web/dashboard/src/app/shared/components/navbar/navbar.component.ts`
- `web/dashboard/src/app/core/app.routes.ts`

## Automated Test Assessment
No new automated tests are required because this is a route and layout extraction around the existing user preference update behavior. The existing dashboard build and unit test suite are sufficient to validate compilation and routing integration.

## Loading State Assessment
The page does not introduce a new asynchronous content section. The authenticated shell resolves the current user before rendering routed content, so no additional skeleton placeholders are required.

## Acceptance Criteria
- [x] Authenticated users can open preferences as a dedicated page.
- [x] The page follows the group preferences page structure.
- [x] Preference updates still call the existing user update flow.
- [x] The obsolete preferences dialog is no longer used.
- [x] The dashboard build passes.
