# Task: filter expert videos by review status

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
As an expert or administrator reviewing submitted videos, I want to filter the Videos page by review status instead of seeing three separate empty-prone sections, so that a small number of videos still appears in a clean and focused layout.

Users without review finalization capability should keep the existing single Videos list.

## Permissions

This task reuses the existing `assets:finalize` permission. No new permissions are required.

## Context
- `web/dashboard/src/app/pages/videos-page/`
- `web/dashboard/src/app/shared/components/asset-list/`
- Taiga UI v4 `Filter` component: `https://taiga-ui.dev/v4/components/filter/`

Product terminology follows `instructions/CONSTITUTION.md`: user-facing labels use "videos"; implementation continues to use the existing `asset` code model.

## Test Assessment

The behavior depends on pure frontend filtering logic. Update focused utility tests for review-status filtering and badge counts.

## Loading State Assessment

The change touches asynchronous Videos page content. The page continues to use the existing `AssetListComponent` Taiga UI skeleton placeholders and does not add visible loading-status text.

## Acceptance Criteria
- [x] Users with `assets:finalize` see one Videos list with Taiga UI review-status filters.
- [x] Users without `assets:finalize` keep the existing Videos list behavior.
- [x] No videos at all produces one illustrated empty state.
- [x] Empty review statuses do not produce separate illustrated messages.
- [x] Filter badges show counts for To review, In review, and Reviewed.
- [x] The dashboard build passes.
