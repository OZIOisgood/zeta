# Task: implement delete reviews feature

## Status

- [x] Defined
- [x] In Progress
- [x] Completed

## Description

Users require the ability to delete reviews (comments) for videos. Currently, reviews can only be created and read, but there is no deletion functionality.

### Backend Requirements

- Add permission slug `reviews:delete` with roles `admin` and `expert`
- Create DELETE endpoint for removing reviews
- Add SQL query for deleting reviews by ID
- Implement handler with appropriate permission checks

### Frontend Requirements

- Add dropdown button to each comment containing a delete option
- Show confirmation dialog before deletion
- Refresh comments list after successful deletion
- Use Taiga UI components (TuiDropdown, TuiConfirm) for UI elements
- Only display delete option for users with `reviews:delete` permission

## Context

- Current reviews implementation: [internal/reviews/handler.go](../../../internal/reviews/handler.go)
- Permissions system: [internal/permissions/permissions.go](../../../internal/permissions/permissions.go)
- Frontend component: [web/dashboard/src/app/pages/asset-details-page/](../../../web/dashboard/src/app/pages/asset-details-page/)
- SQL queries: [db/queries/video_reviews.sql](../../../db/queries/video_reviews.sql)

## Acceptance Criteria

- [x] Permission `reviews:delete` exists and is assigned to `admin` and `expert` roles
- [x] DELETE endpoint `/assets/videos/{videoId}/reviews/{reviewId}` is functional
- [x] Each comment displays a dropdown menu with delete option
- [x] Confirmation dialog appears when delete is clicked
- [x] Comment is removed from database and UI after confirmation
- [x] Only users with `reviews:delete` permission see the delete option
- [x] All builds pass (`make api:build` and `make web:build`)
