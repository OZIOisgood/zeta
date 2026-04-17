# Resolution

## Summary

Implemented a 2-step asset creation process. Assets are initially created with a `waiting_upload` status. This status is invisible to the general `ListAssets` query. A new "complete" endpoint was added to transition the asset to `pending` once the frontend confirms all Mux uploads are finished.

## Technical Details

### Database

- Updated `asset_status` enum to include `waiting_upload`.
- Default status for `assets` table is now `waiting_upload`.
- `ListAssets` query modified to `WHERE a.status != 'waiting_upload'`.

### API

- Added `POST /assets/{id}/complete` endpoint.
- This endpoint transitions the asset from `waiting_upload` to `pending`.

### Frontend

- `AssetService` added `completeUpload` method.
- `UploadVideoPageComponent` now chains the `completeUpload` call after `forkJoin` of all file uploads succeeds.

## Verification

- [x] Build passed (`make api:build`, `make web:build`)
- [x] Verified via database queries and code review that `waiting_upload` is the default and is filtered out.
