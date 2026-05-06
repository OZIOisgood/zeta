# Resolution

## Summary
- Updated the home page "Upcoming Coaching Sessions" widget to use the same card-based list structure as the Sessions page Upcoming tab.
- Preserved the existing empty state, booking fetch flow, and join-session routing.

## Technical Details
- Replaced the home page table-like session rows with session cards containing participant identity, role, date, duration, optional session type, and an "upcoming" badge.
- Updated the loading state to use matching card skeletons with Taiga UI skeleton placeholders.
- Added role-aware participant display logic so the widget labels the other participant consistently with the Sessions page.

## Verification
- [x] `make web:build`
- [x] `cd web/dashboard && pnpm test --watch=false`

## Tests
- No new tests were added. The change is presentational and does not alter booking logic, routing, permissions, or API behavior.

## Next Steps
- None.
