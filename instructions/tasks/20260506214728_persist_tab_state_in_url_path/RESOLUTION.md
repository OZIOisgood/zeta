# Resolution

## Summary
Dashboard tab state now persists in URL path segments for preferences, group preferences, sessions, and availability management.

## Technical Details
- Added default route redirects for base tab pages:
  - `/preferences` to `/preferences/personal-data`
  - `/groups/:id/preferences` to `/groups/:id/preferences/general`
  - `/sessions` to `/sessions/upcoming`
  - `/sessions/settings/:groupId` to `/sessions/settings/:groupId/session-types`
- Updated tab click handlers to navigate to the selected tab path instead of only changing local component state.
- Added route parameter synchronization so reloads and direct links restore the selected tab.
- Normalized invalid tab slugs to default tabs.
- Redirected non-owner access to the group danger-zone tab back to the general preferences tab.
- Wizard steppers were intentionally left unchanged because their state depends on transient selections that are not represented by tab-only route segments.

## Verification
- [x] Build passed: `make web:build`
- [x] Unit tests passed: `cd web/dashboard && pnpm ng test --watch=false`

## Tests
No new automated tests were added. Existing unit tests and the Angular build cover compilation and route typing for this narrow frontend navigation change.

## Next Steps
None.
