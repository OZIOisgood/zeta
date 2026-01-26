# Resolution

## Summary
Added `owner_id` to the `assets` table and updated the backend to populate it from the authenticated user. Updated the frontend `Asset` interface to include this new field.

## Technical Details
-   **Database**: Added `owner_id` column to `assets` table via migration `20260126190000_add_owner_id_to_assets`.
-   **Backend**: 
    -   Updated `CreateAsset`, `ListAssets`, `GetAsset` queries to handle `owner_id`.
    -   Updated `CreateAsset` handler to inject `userCtx.ID` as `owner_id`.
    -   Updated `AssetItem` struct to include `owner_id`.
-   **Frontend**:
    -   Updated `Asset` interface in `asset.service.ts` to include `owner_id`.

## Verification
- [x] Build passed (api:build, web:build)
