# Resolution

## Summary
- Added a dedicated Videos page for the full visible asset list.
- Updated the Home page to show a latest-videos preview capped at 11 videos when the upload tile is visible, or 12 videos otherwise.
- Added a View all action from the Home page videos section to the Videos page.
- Added the Videos link to the desktop and mobile navbar immediately after Home.

## Technical Details
- Reused `AssetListComponent` for both the Home preview and the Videos page.
- Extended `AssetListComponent` with optional header action inputs so section-level navigation can be added without duplicating card markup.
- Reused the existing `/assets` API and asset visibility rules. No backend or permission changes were required.
- Kept the existing Taiga UI skeleton placeholders for asset loading states.

## Verification
- [x] Ran `make web:build`.
- [x] Ran `cd web/dashboard && pnpm exec ng test`.

## Tests

No new automated tests were added. The change is a dashboard routing and composition update that reuses existing services and list rendering. Existing dashboard tests pass.

## Next Steps

None.
