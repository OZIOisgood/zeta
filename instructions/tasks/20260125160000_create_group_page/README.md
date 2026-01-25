# Create Group Page Implementation

## User Story

As a user with the `create-group` feature, I want to be able to create a group. When clicking the "create group" tile, a new page should open (available only with the feature) with one form input for the group name.

## Context

- The backend already has the `CreateGroup` handler in [internal/groups/handler.go](../../../../internal/groups/handler.go)
- The `GroupsService` already has the `create()` method in [web/dashboard/src/app/shared/services/groups.service.ts](../../../../web/dashboard/src/app/shared/services/groups.service.ts)
- The groups page component has a placeholder `onCreateGroup()` method in [web/dashboard/src/app/pages/groups-page/groups-page.component.ts](../../../../web/dashboard/src/app/pages/groups-page/groups-page.component.ts)
- Feature flags are managed through the `FeatureService` and `create-group` flag should be available
- The feature guard pattern is established for route protection

## Acceptance Criteria

1. A new `create-group-page` component is created at `web/dashboard/src/app/pages/create-group-page/`
2. The page contains a form with a single input field for the group name
3. The create-group route is added to `app.routes.ts` with `featureGuard` and `data: { feature: 'create-group' }`
4. The `onCreateGroup()` method in `GroupsPageComponent` navigates to the create-group page
5. The form validates the group name (required field)
6. On successful creation, the page navigates back to the groups page
7. Build completes successfully with `make build` and `make dashboard-build`
