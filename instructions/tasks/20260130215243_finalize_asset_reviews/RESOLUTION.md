# Resolution: Finalize Asset Reviews

## Summary

Implemented the "Mark as Reviewed" functionality that allows experts and admins to finalize an asset. This changes the asset status to `completed` and prevents further modifications to reviews.

## Technical Details

### Backend

- Added `POST /assets/{id}/finalize` endpoint in `internal/assets/handler.go`.
- Added `AssetsFinalize` permission (`assets:finalize`) in `internal/permissions/permissions.go`.
- Updated Review handlers to check for `completed` asset status and forbid `create`, `edit`, or `delete` operations.

### Frontend

- Added `finalizeVideo` method in `AssetService`.
- Added "Mark as Reviewed" button in `AssetDetailsPageComponent`.
- Implemented `canFinalizeReviews` permission check.
- Added confirmation dialog using `TuiDialog`.
- Updated status styling with `TuiBadge`.

### Database

- Utilized existing `completed` status in `asset_status` enum.

## Verification

- [x] Backend build passed (`make api:build`)
- [x] Frontend build passed (`make web:build`)
- [x] Verified user flow:
  - Button appears for authorized users.
  - Dialog appears on click.
  - Status changes to "Reviewed" (completed) upon confirmation.
  - Reviews cannot be added/edited/deleted after finalization.
