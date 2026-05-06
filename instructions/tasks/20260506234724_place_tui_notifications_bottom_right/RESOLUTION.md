# Resolution

## Summary
- Configured the dashboard's global Taiga UI alert position provider so notification hosts render from the bottom-right corner.

## Technical Details
- Added a `TUI_ALERT_POSITION` provider in `app.config.ts`.
- Preserved Taiga UI's existing right-side offsets while changing the vertical margin to bottom placement.
- Kept a mobile-specific value so notifications remain inset on narrow viewports.

## Verification
- [x] Ran `make web:build`.
- [x] Ran `cd web/dashboard && pnpm ng test --watch=false`.

## Tests
No new tests were added. This is a presentation-only provider configuration and does not change application logic.

## Next Steps
No follow-up tasks are required.
