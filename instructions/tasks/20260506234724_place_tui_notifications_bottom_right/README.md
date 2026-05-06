# Task: Place TUI Notifications Bottom Right

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
As a dashboard user, I want Taiga UI notifications to appear in the bottom-right corner so that transient messages avoid the top navigation and page header area.

## Requirements
- Position global Taiga UI alert notifications at the bottom-right corner.
- Preserve the existing responsive spacing for mobile and desktop layouts.
- Avoid changing individual notification call sites.

## Permissions
This change does not introduce new permissions. It only adjusts dashboard presentation.

## Context
- `web/dashboard/src/app/core/app.config.ts`
- Taiga UI `TUI_ALERT_POSITION` controls the margin used by alert notification hosts.

## Automated Test Assessment
No new automated tests are required because the change is a global provider configuration for presentation only. The dashboard build validates the TypeScript integration.

## Loading State Assessment
This change does not introduce or modify asynchronous content loading states.

## Acceptance Criteria
- [x] Taiga UI alert notifications use bottom-right positioning on desktop.
- [x] Taiga UI alert notifications use bottom-right positioning on mobile.
- [x] The dashboard build passes.
