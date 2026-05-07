# Task: Create Home First Steps Component

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
As a new dashboard user, I want the home page to present a single guided first-steps experience instead of multiple illustrated empty states, so that the first screen feels purposeful and clear.

## Context
- The home page currently renders empty states for both upcoming coaching sessions and latest videos when there is no content.
- The reference implementation in `tmp/video-coach/coach-it-frontend/src/app/pages/home-page` uses a first-steps checklist for new users.
- Relevant files:
  - `web/dashboard/src/app/pages/home-page/home-page.component.*`
  - `web/dashboard/src/app/pages/home-page/ui/first-steps/*`

## Permissions
- No new permissions are required.
- The first-steps actions reuse existing dashboard permissions:
  - `groups:read`
  - `groups:create`
  - `assets:create`
  - `coaching:book`
  - `coaching:availability:manage`
  - `reviews:read`

## Loading State Assessment
- This task touches asynchronous home-page content for videos, groups, and bookings.
- Existing Taiga UI skeletons remain in place while content loads.
- The first-steps component is shown only after the relevant content requests have completed.

## Automated Test Assessment
- No automated tests are required for this narrow presentation change.
- The required verification is the dashboard build, which covers template and type correctness for the new standalone component.

## Acceptance Criteria
- [x] New users with no home content see one First steps component instead of multiple illustrated empty states.
- [x] First-step actions are derived from the user's existing permissions.
- [x] Existing coaching and video sections continue to render when they have content.
- [x] `make web:build` succeeds.
