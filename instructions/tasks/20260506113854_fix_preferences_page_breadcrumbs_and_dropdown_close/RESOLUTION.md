# Resolution

## Summary
- Removed the breadcrumbs component from the user preferences page.
- Added controlled open state for the desktop navbar user dropdown.
- Closed the dropdown when the Preferences action navigates to `/preferences`.

## Technical Details
- `UserPreferencesPageComponent` no longer imports or renders `BreadcrumbsComponent`.
- `NavbarComponent` now tracks `userDropdownOpen` with an Angular signal and binds it to `tuiDropdownOpen`.

## Verification
- [x] Ran `make web:build`.
- [x] Ran `cd web/dashboard && pnpm ng test --watch=false`.

## Tests
No new tests were added. Existing dashboard checks cover template compilation and current unit coverage.

## Next Steps
No follow-up tasks are required.
