# Resolution

## Summary

Successfully implemented the delete reviews feature with proper permission checks and user interface components. Users with `admin` or `expert` roles can now delete comments on videos through a dropdown menu with confirmation dialog.

## Technical Details

### Backend Changes

1. **Permissions** ([internal/permissions/permissions.go](../../../internal/permissions/permissions.go))
   - Added `ReviewsDelete` constant with value `"reviews:delete"`
   - Assigned permission to `admin` and `expert` roles

2. **Database** ([db/queries/video_reviews.sql](../../../db/queries/video_reviews.sql))
   - Added `DeleteVideoReview` SQL query
   - Regenerated Go code using `make db:sqlc`

3. **API Handler** ([internal/reviews/handler.go](../../../internal/reviews/handler.go))
   - Implemented `DeleteReview` handler function with permission checks
   - Registered DELETE route: `/assets/videos/{id}/reviews/{reviewId}`
   - Added structured logging for delete operations

### Frontend Changes

1. **Services**
   - Updated [asset.service.ts](../../../web/dashboard/src/app/shared/services/asset.service.ts) with `deleteReview` method
   - Updated [permissions.service.ts](../../../web/dashboard/src/app/shared/services/permissions.service.ts) to include `reviews:delete` permission type and assignments

2. **Component** ([asset-details-page](../../../web/dashboard/src/app/pages/asset-details-page/))
   - Added dropdown button to each comment using Taiga UI components (TuiDropdown, TuiDataList)
   - Implemented `deleteReview` method with confirmation dialog
   - Added `canDeleteReviews` computed signal for permission checking
   - Used existing `ConfirmDialogService` for user confirmation
   - Dropdown only visible to users with `reviews:delete` permission

### Key Technical Decisions

- Used existing `ConfirmDialogService` instead of installing additional `@taiga-ui/addon-mobile` package
- Followed structured logging patterns with `log/slog` and request-scoped loggers
- Applied permission checks at both backend and frontend layers for security
- Used `switchMap` operator to chain confirmation and deletion operations
- Refreshes comment list after successful deletion

## Verification

- [x] Build passed (`make api:build` and `make web:build`)
- [x] Permission system correctly restricts delete functionality to admin and expert roles
- [x] Confirmation dialog prevents accidental deletions
- [x] UI updates automatically after successful deletion

## Files Modified

- `internal/permissions/permissions.go`
- `db/queries/video_reviews.sql`
- `internal/reviews/handler.go`
- `web/dashboard/src/app/shared/services/asset.service.ts`
- `web/dashboard/src/app/shared/services/permissions.service.ts`
- `web/dashboard/src/app/pages/asset-details-page/asset-details-page.component.ts`
- `web/dashboard/src/app/pages/asset-details-page/asset-details-page.component.html`
