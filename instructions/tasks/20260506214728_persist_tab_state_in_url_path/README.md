# Task: Persist Tab State in URL Path

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
As a dashboard user, I want tab selection to be represented by the URL path so that refreshing a tabbed page or sharing its URL preserves the selected tab.

Wizard steppers are not included in this task. Their later steps depend on transient form selections that are not currently encoded in the route.

## Context
- `web/dashboard/src/app/core/app.routes.ts`
- `web/dashboard/src/app/pages/user-preferences-page/`
- `web/dashboard/src/app/pages/group-preferences-page/`
- `web/dashboard/src/app/pages/my-sessions-page/`
- `web/dashboard/src/app/pages/manage-availability-page/`

## Permissions
No new permissions are required. This task changes dashboard route state only and reuses the existing route guards and permissions.

## Test Assessment
No automated tests are required for this narrow route-state change. The behavior is verified through the Angular build and route/component implementation review.

## Loading State Assessment
This task does not introduce new asynchronous content loading states. Existing skeleton placeholders remain unchanged.

## Acceptance Criteria
- [x] User preference tabs are addressable through URL path segments.
- [x] Group preference tabs are addressable through URL path segments.
- [x] Session list tabs are addressable through URL path segments.
- [x] Availability management tabs are addressable through URL path segments.
- [x] Existing base URLs continue to resolve to the default tab.
- [x] Invalid or unauthorized tab paths are normalized to the default tab.
