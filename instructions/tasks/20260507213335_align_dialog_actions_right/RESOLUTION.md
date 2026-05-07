# Resolution

## Summary
- Reordered custom dialog action buttons so secondary actions appear before primary or destructive actions.
- Right-aligned the accept-invite and invite-dialog action rows that were previously centered or split across the row.

## Technical Details
- Preserved existing button labels, appearances, disabled states, and click or submit handlers.
- Removed the invite-dialog spacer so all generated-invitation buttons align together on the right while keeping `Done` as the rightmost main action.

## Verification
- [x] Ran `make web:build`.
- [x] Ran `cd web/dashboard && pnpm run test --watch=false`.

## Tests
- No automated tests were added because the change only adjusts declarative template order and CSS alignment. Existing dashboard tests passed.

## Next Steps
- None.
