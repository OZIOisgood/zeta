# Task: Enforce Review Requirement for Asset Finalization

## Status

- [x] Defined
- [x] In Progress
- [x] Completed

## Description

Implemented strict validation to prevent finalizing assets that have videos without reviews. This ensures quality control by requiring at least one review per video before an asset can be marked as reviewed. The system now provides clear error feedback when attempting to finalize unreviewed videos.

## Context

- **Issue**: Previously, experts could finalize assets even if some videos had no reviews
- **Business Rule**: All videos must have at least one review before the asset can be finalized
- **User Experience**: Clear error messaging prevents accidental finalization of incomplete reviews

## Changes Made

### Backend Validation

**Database Queries** ([db/queries/video_reviews.sql](../../../../db/queries/video_reviews.sql)):

- Added `HasVideosWithoutReviews` query to check for videos without reviews
- Added `CountVideosWithoutReviews` query for future analytics

**Asset Handler** ([internal/assets/handler.go](../../../../internal/assets/handler.go)):

- Added review validation in `FinalizeAsset` method
- Returns HTTP 400 with clear error message when unreviewed videos exist
- Logs appropriate warnings for audit trail

**Generated Code** ([internal/db/video_reviews.sql.go](../../../../internal/db/video_reviews.sql.go)):

- Auto-generated Go functions for new SQL queries

### Frontend Real-time Tracking

**Asset Service** ([web/dashboard/src/app/shared/services/asset.service.ts](../../../../web/dashboard/src/app/shared/services/asset.service.ts)):

- Added `review_count` property to `VideoItem` interface

**Video Queries** ([db/queries/assets.sql](../../../../db/queries/assets.sql)):

- Modified `GetAssetVideos` to include review count per video
- Uses LEFT JOIN with video_reviews table and COUNT aggregation

**Asset Details Component** ([web/dashboard/src/app/pages/asset-details-page/asset-details-page.component.ts](../../../../web/dashboard/src/app/pages/asset-details-page/asset-details-page.component.ts)):

- Added `videoReviewCounts` Map for real-time tracking
- Initializes counts from asset data on load
- Updates counts when reviews are added/deleted
- Shows error dialog (not warning) when attempting to finalize with unreviewed videos
- Error dialog only has "OK" button - no option to proceed

## Acceptance Criteria

- [x] Backend rejects finalization if any video lacks reviews
- [x] Frontend shows error dialog for unreviewed videos
- [x] Real-time review count tracking prevents stale data
- [x] Error dialog has no "proceed" option
- [x] Clear error messages explain the requirement
- [x] Logging captures validation failures for audit

## Files Modified

- `db/queries/assets.sql` - Added review count to video queries
- `db/queries/video_reviews.sql` - Added validation queries
- `internal/assets/handler.go` - Added finalization validation
- `internal/db/assets.sql.go` - Auto-generated query code
- `internal/db/video_reviews.sql.go` - Auto-generated query code
- `web/dashboard/src/app/shared/services/asset.service.ts` - Added review_count to interface
- `web/dashboard/src/app/pages/asset-details-page/asset-details-page.component.ts` - Real-time tracking and error dialog
