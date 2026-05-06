# Resolution

## Summary
- Updated live coaching slot generation so irregular availability starts are rounded up to the next session-duration grid boundary in the expert's local day.
- Restricted session type durations to 15-120 minutes in 5-minute increments across the API, database constraints, and dashboard selector.

## Technical Details
- Added `alignSlotStartToDurationGrid` to begin computed slots at the next valid boundary before applying minimum notice, blocked-slot, and booking-overlap filters.
- Added reusable duration validation for session type create and update handlers.
- Added a database migration that tightens `coaching_session_types` and `coaching_bookings` duration constraints.
- Expanded the dashboard duration selector to offer every 5-minute increment from 15 through 120 minutes.

## Verification
- [x] `go test ./internal/coaching -count=1`
- [x] `go test ./... -count=1`
- [x] `make api:build`
- [x] `make web:build`

## Tests
- Added unit coverage for odd availability starts at 13:33, 16:01, and 16:46.
- Added unit coverage for valid and invalid 5-minute session duration increments.

## Next Steps
- None.
