# Resolution

## Summary

Renamed the `upload-video` feature slug to `create-asset` in both backend and frontend. This change aligns the feature flag with the new naming convention in the WorkOS dashboard.

## Details

### Code Changes

- **Backend**: Updated `internal/assets/handler.go` to check for `create-asset` feature instead of `upload-video`.
- **Frontend**:
  - Updated `Feature` type in `web/dashboard/src/app/shared/services/feature.service.ts`.
  - Updated `home-page` component to check for `create-asset`.
  - Updated `navbar` component to check for `create-asset`.
  - Updated routing configuration to require `create-asset` feature for `upload-video` route.

### Verification

- `make api:build` passed.
- `make web:build` passed.
- Feature checks now use the new slug.
