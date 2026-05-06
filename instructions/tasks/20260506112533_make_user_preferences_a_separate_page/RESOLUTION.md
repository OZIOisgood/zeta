# Resolution

## Summary
- Added a dedicated user preferences page at `/preferences`.
- Updated the navbar preferences actions to navigate to the page.
- Preserved the existing first name, last name, language, timezone, and avatar update flow through `AuthService.updateUser`.
- Removed the obsolete user preferences dialog component.

## Technical Details
- The new page mirrors the group preferences page structure with breadcrumbs, a section header, vertical tabs, and a form action area.
- The page uses the authenticated user already loaded by the shell and continues to use the existing `PUT /auth/me` API contract.
- No permissions were added because the page is available to all authenticated users.

## Verification
- [x] Ran `make web:build`.
- [x] Ran `cd web/dashboard && pnpm ng test --watch=false`.

## Tests
No new tests were added. The change moves existing form behavior from a dialog to a routed page and was verified through the existing dashboard unit test suite and production build.

## Next Steps
No follow-up tasks are required.
