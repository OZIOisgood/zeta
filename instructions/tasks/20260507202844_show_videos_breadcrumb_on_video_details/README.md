# Task: show videos breadcrumb on video details

## Status
- [x] Defined
- [ ] In Progress
- [x] Completed

## Description
As a dashboard user, I want video detail pages to show the Videos page as the previous breadcrumb entry so that the navigation path reflects the product area for all uploaded videos.

## Context
- Product language treats dashboard assets as user-facing videos.
- The asset details page currently renders a breadcrumb path that starts with Home.
- Relevant file: `web/dashboard/src/app/pages/asset-details-page/asset-details-page.component.html`.

## Permissions
This change does not introduce or modify permissions. It reuses the existing asset details route access behavior.

## Test Assessment
This is a static breadcrumb label and router link change. No automated test is required because the affected behavior is declarative template copy/navigation with no branching logic.

## Loading State Assessment
This change does not introduce or alter asynchronous content loading states.

## Acceptance Criteria
- [x] Video detail pages show Videos as the previous breadcrumb entry.
- [x] The previous breadcrumb entry links to `/videos`.
- [x] The dashboard build passes.
