# Resolution

## Changes

1.  **Backend**:
    - Added `UpdateVideoReview` query to `video_reviews.sql`.
    - Generated Go code using `sqlc`.
    - Added `ReviewsEdit` permission and assigned to `admin` and `expert`.
    - Implemented `PUT /{id}/reviews/{reviewId}` endpoint in `reviews` handler.

2.  **Frontend**:
    - Added `reviews:edit` permission to `PermissionsService`.
    - Added `updateReview` method to `AssetService`.
    - Updated `AssetDetailsPageComponent` to support review editing:
        - Added Edit option to review dropdown.
        - Implemented edit dialog using `TuiDialog` directive.
        - Added logic to save updated review.

## Verification

- `make api:build` passed.
- `make web:build` passed.

## Fixes applied
- Fixed NG01203 error by changing `tui-textarea` directive usage to `tui-textfield` wrapper.
- Adjusted edit dialog size to 'm' and aligned Save button to the right.
- Fixed dropdown option alignment by adding `justify-content: flex-start`.
- Fixed page reload on form submit by using `(submit)` with `preventDefault` instead of `(ngSubmit)` to handle native form submission behavior when FormsModule is not imported for the form tag.
- Fixed NG0100 error when closing dialog by wrapping `editDialogOpen = false` in `setTimeout`.
- Fixed NG0100 error by passing `observer` (from `tuiDialog` directive) to `saveEditedReview` and calling `observer.complete()` to close the dialog, instead of manually toggling the bound boolean variable.
