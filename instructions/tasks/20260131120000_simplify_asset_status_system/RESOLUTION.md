# Resolution: Simplify Asset Status System

## Summary

Simplified the asset status enum and flow to better match the user experience and business logic. The status lifecycle is now: `waiting_upload` → `pending` → `completed`.

## Technical Details

### Database

- Updated `asset_status` enum in `db/migrations/20260122000001_create_assets_videos.up.sql`.
- Removed `in_review` and `finalized` statuses.
- kept `waiting_upload`, `pending`, and `completed`.

### Backend

- Updated `FinalizeAsset` handler to transition status to `completed`.
- Updated all reference checks in `internal/reviews/handler.go` to check against `AssetStatusCompleted`.
- Updated error messages to reflect "completed" terminology.

### Frontend

- Updated `AssetStatus` type definition.
- Updated `AssetDetailsPageComponent` to:
  - Treat `completed` as the finalized state.
  - Display "Reviewing" for `pending` status (Yellow/Warning badge).
  - Display "Reviewed" for `completed` status (Green/Success badge).
- Updated `AssetListComponent` (Home Page) to match the same badge logic and styling.

## Verification

- [x] Database migration applied successfully (`make infra:restart`).
- [x] Backend build passed.
- [x] Frontend build passed.
- [x] UI displays correct labels ("Reviewing", "Reviewed") and colors (Yellow, Green).
