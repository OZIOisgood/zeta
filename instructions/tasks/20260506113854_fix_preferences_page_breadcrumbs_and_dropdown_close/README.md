# Task: Fix Preferences Page Breadcrumbs and Dropdown Close

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
As an authenticated dashboard user, I want the user preferences page to avoid redundant breadcrumbs and I want the navbar dropdown to close after choosing Preferences so that navigation leaves the header in a clean state.

## Requirements
- Hide breadcrumbs on the dedicated user preferences page.
- Close the desktop navbar `tui-dropdown` when the Preferences option is clicked.
- Preserve the existing preferences page route and update behavior.

## Permissions
This change does not introduce new permissions. It only adjusts authenticated dashboard presentation and navbar interaction state.

## Context
- `web/dashboard/src/app/pages/user-preferences-page/`
- `web/dashboard/src/app/shared/components/navbar/navbar.component.ts`
- `web/dashboard/src/app/shared/components/navbar/navbar.component.html`

## Automated Test Assessment
No new automated tests are required because the change is a small presentation and interaction-state fix. The dashboard build and existing unit test suite validate template and TypeScript integration.

## Loading State Assessment
This change does not introduce or modify asynchronous content loading states.

## Acceptance Criteria
- [x] The user preferences page does not render `tui-breadcrumbs`.
- [x] Clicking Preferences in the desktop navbar dropdown closes the dropdown before navigation.
- [x] The dashboard build passes.
