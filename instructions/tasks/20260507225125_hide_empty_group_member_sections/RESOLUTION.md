# Resolution

## Summary
Updated the group details member lists so empty Experts sections are hidden after their corresponding member list has loaded. Adjusted the member headings so Experts appears before Students, both use `h2`, and the Invite action sits beside Students instead of under a generic Members heading. Empty Students sections now remain visible for users who can invite students and include an illustrated invitation CTA.

## Technical Details
- Added loaded-count reporting from `app-users-list` through an asynchronous `usersLoaded` output.
- Removed the member-list empty-state message from `app-users-list`; loaded empty lists now render no list content.
- Added group details page visibility state for Students and Experts sections, preserving skeleton placeholders while each permitted list is still loading.
- Removed the generic Members header.
- Rendered Experts before Students.
- Moved the Invite action into the Students section header.
- Added an illustrated empty Students state with an invitation button that opens the existing invitation dialog.

## Tests

Automated unit tests were not added because this is a presentation-state change around existing API data. Existing dashboard tests were run successfully.

## Verification
- [x] Ran `make web:build`.
- [x] Ran `cd web/dashboard && pnpm test`.
- [x] Confirmed root `ISSUES.md` is not present in this checkout, so no issue status was updated.
