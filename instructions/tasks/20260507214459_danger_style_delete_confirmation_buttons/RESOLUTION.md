# Resolution

## Summary
Destructive confirmation dialog primary actions now use the Taiga UI `destructive` appearance consistently across dashboard delete and remove flows.

## Technical Details
- Added `appearance: 'destructive'` to the delete comment confirmation.
- Added `appearance: 'destructive'` to delete session type, delete availability, and delete blocked date confirmations.
- Updated both Delete Group confirmation paths to use `destructive`, replacing the older `accent` appearance in the group preferences page.
- Added the same destructive appearance to the remove-user confirmation because it performs a destructive membership removal.
- No permissions, API contracts, loading states, or business logic were changed.

## Verification
- [x] Build passed with `make web:build`.
- [x] Verified by static review of all `TUI_CONFIRM` destructive dialog data.

## Tests

No automated tests were added. The change is declarative presentation configuration for Taiga UI confirmation buttons.

## Next Steps

None.
