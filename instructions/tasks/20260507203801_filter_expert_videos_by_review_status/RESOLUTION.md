# Resolution

## Summary
- Replaced the expert Videos page's three review-status sections with one Taiga UI filterable Videos list.
- Preserved the existing single-list Videos page for users without review finalization permission.

## Technical Details
- Added review-status filter helpers for selecting and counting videos by `To review`, `In review`, and `Reviewed`.
- Used Taiga UI `tui-filter` with a separate `All` button, where no selected filter means all videos are shown.
- Kept the shared asset list responsible for grid rendering, skeleton placeholders, and the single illustrated empty state.

## Verification
- [x] Ran `cd web/dashboard && pnpm exec vitest run src/app/pages/videos-page/videos-page.component.spec.ts`.
- [x] Ran `make web:build`.

## Tests
- Updated `videos-page.component.spec.ts` for review-status filtering and filter badge counts.

## Next Steps
- None.
