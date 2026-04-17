# Resolution

## Summary

Implemented the User Preferences feature and refactored the Avatar Selection logic into a shared component.

## Technical Details

### Backend

- Added `UpdateMe` handler in `internal/features/handler.go`.
- Updated `User` model to support `Language`.
- Added request validation for user updates.

### Frontend

- Created `AvatarSelectorComponent`:
  - Handles file selection
  - Client-side compression (max 256x256, 0.8 quality)
  - Validation (max 300KB)
  - Preview display
- Created `PreferencesDialogComponent`:
  - Uses `AvatarSelectorComponent`
  - Integration with `UserService` to update user data
  - Uses `TuiDataListWrapper` for Language selection
- Refactored `CreateGroupPageComponent`:
  - Replaced inline file logic with `<app-avatar-selector>`
  - Removed duplicate compression logic
  - Maintained original styling (width: 100% for preview container)

## Verification

- [x] Build passed (`make web:build`)
- [x] Backend restart `make infra:restart`
- [x] Verified UI consistency between pages
- [ ] Verified in UI/API
