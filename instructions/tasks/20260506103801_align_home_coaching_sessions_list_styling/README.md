# Task: align home coaching sessions list styling

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
Align the "Upcoming Coaching Sessions" list on the dashboard home page with the visual treatment used by the Sessions page Upcoming tab.

## Context
- Home page widget: `web/dashboard/src/app/pages/home-page/home-page.component.html`
- Home page styling: `web/dashboard/src/app/pages/home-page/home-page.component.scss`
- Reference implementation: `web/dashboard/src/app/pages/my-sessions-page/my-sessions-page.component.html`
- Reference styling: `web/dashboard/src/app/pages/my-sessions-page/my-sessions-page.component.scss`
- No new permissions are required. The widget continues to rely on the existing coaching booking read and booking permissions.

## Test Assessment
- Automated tests are not required because this change is presentational and does not alter booking logic, routing, or API behavior.
- This change touches an asynchronous loading state. The home page must continue to use Taiga UI skeleton placeholders rather than visible loading text.

## Acceptance Criteria
- [x] The home page upcoming coaching sessions list uses the same card-based structure as the Sessions page Upcoming list.
- [x] The home page skeleton state matches the card-based loading layout.
- [x] The home page upcoming rows show the other participant, participant role, date, duration, optional session type, and an "upcoming" badge in the Sessions page style.
- [x] `make web:build` succeeds.
