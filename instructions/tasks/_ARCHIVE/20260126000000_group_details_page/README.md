# Group Details Page Implementation

## User Story

As a user with the `groups` feature, I want to be able to click on a group tile on the groups page and be redirected to a group details page. The group details page should be empty for now and also protected by the `groups` feature flag.

## Context

- The groups page already exists and displays a list of groups
- The `GroupsService` already provides methods to fetch groups
- Feature guards are established and working for route protection
- The groups-list component displays group tiles

## Acceptance Criteria

1. A new `group-details-page` component is created at `web/dashboard/src/app/pages/group-details-page/`
2. The page is empty (placeholder content only)
3. A new route `/groups/:id` is added to `app.routes.ts` with `featureGuard` and `data: { feature: 'groups' }`
4. The groups-list component emits a selection event when a group tile is clicked
5. The groups-page component handles the selection and navigates to `/groups/:id`
6. Build completes successfully with `make build` and `make dashboard-build`
