# Task: Split Expert Videos by Review Status

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
As an expert, the Videos page must separate visible videos into three review-oriented lists:

- **In review**: pending videos that already have at least one review comment.
- **To review**: pending videos that do not have any review comments yet.
- **Reviewed**: completed videos.

Students and other users without review finalization capability should continue to see the existing single Videos list.

## Permissions

This task reuses the existing `assets:finalize` permission rather than introducing a new role check. The permission already controls who can mark a video as reviewed, so it is the closest existing capability for the expert review workflow. Users with this permission, including administrators, receive the grouped expert view.

## Context
- `web/dashboard/src/app/pages/videos-page/`
- `web/dashboard/src/app/shared/components/asset-list/`
- `web/dashboard/src/app/shared/services/asset.service.ts`
- `internal/assets/handler.go`
- `db/queries/assets.sql`
- `internal/permissions/permissions.go`

Product terminology follows `instructions/CONSTITUTION.md`: user-facing labels use "videos"; backend and SQL keep `asset` for the parent reviewable submission.

## Test Assessment

The behavior depends on a new field in the asset-list API response and frontend filtering logic. Add focused unit coverage for the videos page grouping. Existing backend handler tests cover the list endpoint visibility scope; the response shape is updated there to assert review counts are passed through.

## Loading State Assessment

The change touches asynchronous asset list rendering on the Videos page. It continues to use the existing `AssetListComponent` Taiga UI skeleton placeholders and does not add visible loading-status text.

## Acceptance Criteria
- [x] Users with `assets:finalize` see the Videos page split into "In review", "To review", and "Reviewed".
- [x] Users without `assets:finalize` keep the existing single Videos list.
- [x] Pending videos with no review comments appear under "To review".
- [x] Pending videos with one or more review comments appear under "In review".
- [x] Completed videos appear under "Reviewed".
- [x] Empty grouped lists use the existing video empty-state pattern.
- [x] The dashboard build passes.
