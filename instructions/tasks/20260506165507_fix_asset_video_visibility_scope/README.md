# Task: Fix Asset Video Visibility Scope

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
Students must only see videos that they uploaded themselves. Experts and administrators must only see videos submitted to groups where they are members. The current asset list returns all uploaded assets, which allows a newly created student account to see videos uploaded by other users.

## User Story
As an authenticated dashboard user, I need video visibility to be limited to my ownership or group membership scope, so that videos from unrelated users or unrelated groups are not exposed.

## Permissions
No new permissions are required.

The existing role and permission model remains unchanged in `internal/permissions/permissions.go`. This task adds object-level visibility checks:

- Students are scoped by `assets.owner_id`.
- Experts and administrators are scoped by `user_groups` membership for the asset group.
- Review and finalization endpoints retain their existing permissions and additionally require asset or video visibility.

## Context
- `db/queries/assets.sql`
- `db/queries/video_reviews.sql`
- `internal/assets/handler.go`
- `internal/reviews/handler.go`
- `internal/permissions/permissions.go`

The root cause is that the asset list query did not include a user-specific visibility predicate. Detail and review endpoints also required object-level checks to avoid direct access by ID.

## Test Assessment
Automated tests are required because this is an access-control regression. Unit tests must verify that asset listing uses the correct student and non-student scopes, and that review access requires video visibility before returning review data.

## Acceptance Criteria
- [x] Students only receive assets where they are the uploader.
- [x] Experts only receive assets for groups where they are members.
- [x] Administrators use the same group-membership visibility model as experts.
- [x] Asset details cannot be fetched outside the user's visibility scope.
- [x] Video review endpoints require both the existing review permission and visibility of the target video.
- [x] Asset finalization requires both `assets:finalize` and visibility of the target asset.
- [x] Automated tests cover the visibility scope behavior.
