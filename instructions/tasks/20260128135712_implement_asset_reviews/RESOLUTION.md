# Task Resolution: implement_asset_reviews

## Summary

Implemented the reviews feature which allows users to read and write comments on videos (sub-assets).

## Changes

1.  **Database**:
    - Created migration `20260128140000_create_asset_reviews` to add `video_reviews` table.
    - Added `db/queries/video_reviews.sql` for CRUD operations.
    - Updated `video_reviews` to link to `video_id` instead of `asset_id`.
    - Removed `user_id` from `video_reviews` table for anonymity/simplicity as requested.
    - Generated Go code using `make db:sqlc`.

2.  **Backend**:
    - Created new package `internal/reviews`.
    - Implemented `ListReviews` and `CreateReview` handlers in `internal/reviews/handler.go`.
    - Registered routes: `GET /assets/videos/{id}/reviews` and `POST /assets/videos/{id}/reviews`.
    - Integrated feature flag checks: `reviews--read` and `reviews--create`.
    - Refactored `server.go` to mount the reviews handler.

3.  **Frontend**:
    - Updated `FeatureService` to include new feature flags: `reviews`, `reviews--read`, `reviews--create`.
    - Updated `AssetService` to include `getReviews` and `createReview` methods leveraging `videoId`.
    - Updated `AssetDetailsPageComponent` to fetch and display reviews for the currently selected video.
    - Added comments section UI using `tuiCardLarge`.
    - Implemented a floating comment input container.

## Verification

- **Database**: Migration applied.
- **Backend**: Build passed (`make api:build`).
- **Frontend**: Build passed (`make web:build`).

## Next Steps

- Add tests for backend handlers.
