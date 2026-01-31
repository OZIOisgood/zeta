# Task: finalize asset reviews

## Status

- [x] Defined
- [x] In Progress
- [x] Completed

## Description

Implemented functionality to finalize/mark assets as reviewed. This feature allows experts to mark an asset as fully reviewed, preventing further modifications to comments and marking the review process as complete.

## Context

- **Permission**: `assets:finalize` (admin and expert roles)
- **Endpoint**: `POST /assets/{id}/finalize`
- **UI Component**: "Mark as Reviewed" button on asset details page
- **Status Change**: `pending` → `completed`

## Implementation Details

### Backend Changes

- Added `FinalizeAsset` handler in [internal/assets/handler.go](../../../../internal/assets/handler.go)
- Uses `assets:finalize` permission for authorization
- Updates asset status to `completed`
- Review handlers check for completed status and prevent modifications

### Frontend Changes

- Added button "Mark as Reviewed" on asset details page (next to status badge)
- Button styled to match upload page buttons (size="m", no secondary appearance)
- Shows confirmation dialog before finalizing
- Updates local asset state on successful finalization
- Status badge displays "Reviewed" (green) when completed

### UI/UX

- Status displays as "Reviewing" (yellow badge) when pending
- Status displays as "Reviewed" (green badge) when completed
- Confirmation dialog: "Are you sure you want to mark this video as reviewed? No more comments can be added, edited, or deleted."
- Success message: "Video marked as reviewed successfully"

## Acceptance Criteria

- [x] Only admin and expert can finalize assets (`assets:finalize` permission)
- [x] Confirmation dialog appears before finalizing
- [x] Asset status changes to `completed` on finalization
- [x] Cannot add comments to completed assets
- [x] Cannot edit comments on completed assets
- [x] Cannot delete comments from completed assets
- [x] Status badge shows "Reviewed" for completed assets
- [x] Button hidden when asset is already completed
- [x] Button styled consistently with upload page

## Files Modified

- [internal/permissions/permissions.go](../../../../internal/permissions/permissions.go) - Added AssetsFinalize constant
- [internal/assets/handler.go](../../../../internal/assets/handler.go) - Added FinalizeAsset handler
- [internal/reviews/handler.go](../../../../internal/reviews/handler.go) - Added status validation for all operations
- [web/dashboard/src/app/shared/services/permissions.service.ts](../../../../web/dashboard/src/app/shared/services/permissions.service.ts) - Added assets:finalize permission
- [web/dashboard/src/app/shared/services/asset.service.ts](../../../../web/dashboard/src/app/shared/services/asset.service.ts) - Added finalizeVideo method
- [web/dashboard/src/app/pages/asset-details-page/](../../../../web/dashboard/src/app/pages/asset-details-page/) - Implemented UI components

## Notes

- Server validates finalization status on every review operation (add/edit/delete)
- Frontend hides UI elements appropriately but server-side validation is primary defense
- Permission system ensures only authorized users can finalize assets
