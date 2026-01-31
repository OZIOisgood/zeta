# Task: Simplify Asset Status System

## Status

- [x] Defined
- [x] In Progress
- [x] Completed

## Description

Simplified the asset status system from 5 values to 3 essential states. The old system had redundant states (`in_review` and `finalized`) that didn't align with the actual business logic. Now assets have clear, meaningful states that match the user workflow.

## Context

- **Files modified**: Database schema, backend handlers, frontend service and components
- **Motivation**: Reduce complexity while maintaining all required functionality
- **User workflow**: Upload → Pending Review → Reviewed/Completed

## Changes Made

### Database

- Updated `asset_status` enum from `('waiting_upload', 'pending', 'in_review', 'finalized', 'completed')`
- To: `('waiting_upload', 'pending', 'completed')`
- Migration: [20260122000001_create_assets_videos.up.sql](../../../../db/migrations/20260122000001_create_assets_videos.up.sql)

### Backend (Go)

- Updated [internal/assets/handler.go](../../../../internal/assets/handler.go): Finalize action now sets status to `completed`
- Updated [internal/reviews/handler.go](../../../../internal/reviews/handler.go): All review operations check for `completed` status
- Updated error messages to reference "completed asset" instead of "finalized asset"

### Frontend (Angular)

- Updated [asset.service.ts](../../../../web/dashboard/src/app/shared/services/asset.service.ts): AssetStatus type now includes only valid states
- Updated [asset-details-page.component.ts](../../../../web/dashboard/src/app/pages/asset-details-page/asset-details-page.component.ts):
  - `isFinalized()` checks for `completed` status
  - `formatStatus()` displays "In review" for `pending` and "Reviewed" for `completed`
  - Dialog and messages updated to reflect "Mark as Reviewed" terminology
- UI now uses consistent TuiBadge component on both home page and asset details page

### User-Facing Changes

- Status display on asset tiles and details page now shows user-friendly labels:
  - `pending` → "In review" (yellow badge)
  - `completed` → "Reviewed" (green badge)
- Button changed from "Finish Review" to "Mark as Reviewed"
- Dialog updated to say "Mark Video as Reviewed" with corresponding confirmation message

## Acceptance Criteria

- [x] Database migration applied successfully
- [x] Backend builds without errors
- [x] All review operations respect completed status
- [x] Frontend builds without errors
- [x] Status displayed consistently across home page and asset details
- [x] Both pending and completed statuses have appropriate styling
- [x] User terminology matches system status (e.g., "In review" for pending)

## Technical Details

**Old Status Flow:**

```
waiting_upload → pending → in_review → finalized → completed
```

**New Status Flow:**

```
waiting_upload → pending → completed
```

The new system is simpler because:

1. `in_review` was redundant - `pending` already meant "awaiting review"
2. `finalized` was redundant - we use `completed` to indicate review is done
3. The "Mark as Reviewed" action directly transitions from `pending` → `completed`

## Files Modified

- [db/migrations/20260122000001_create_assets_videos.up.sql](../../../../db/migrations/20260122000001_create_assets_videos.up.sql)
- [internal/assets/handler.go](../../../../internal/assets/handler.go)
- [internal/reviews/handler.go](../../../../internal/reviews/handler.go)
- [web/dashboard/src/app/shared/services/asset.service.ts](../../../../web/dashboard/src/app/shared/services/asset.service.ts)
- [web/dashboard/src/app/pages/asset-details-page/asset-details-page.component.ts](../../../../web/dashboard/src/app/pages/asset-details-page/asset-details-page.component.ts)
- [web/dashboard/src/app/pages/asset-details-page/asset-details-page.component.html](../../../../web/dashboard/src/app/pages/asset-details-page/asset-details-page.component.html)
- [web/dashboard/src/app/pages/asset-details-page/asset-details-page.component.scss](../../../../web/dashboard/src/app/pages/asset-details-page/asset-details-page.component.scss)

## Notes

- The status system now directly reflects the business logic: files upload, then they're reviewed, then they're done
- No breaking changes to API contracts (external consumers should still work)
- Review restrictions (no add/edit/delete on completed assets) remain in place and are validated server-side
