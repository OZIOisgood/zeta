# Resolution

## Summary
The availability dialog now orders weekday options according to the user's configured timezone and language. Users with `Europe/Berlin` and other supported Monday-first timezone regions see Monday at the top of the "Day" dropdown.

## Technical Details
- Added shared weekday utilities for stable weekday names, timezone/browser-locale first-day resolution, and ordered day values.
- Passed the resolved first day from `ManageAvailabilityPageComponent` into `AvailabilityDialogComponent`.
- Preserved the existing `day_of_week` API contract where Sunday is `0`, Monday is `1`, and Saturday is `6`.
- Updated the stale root app unit test harness so the full dashboard test suite runs with Taiga event plugins and checks the current shell output.

## Verification
- [x] `make web:build`
- [x] `PATH=/Users/test/.nvm/versions/node/v20.19.1/bin:$PATH pnpm exec ng test --watch=false`

## Tests
Added `web/dashboard/src/app/shared/utils/weekdays.spec.ts` to cover Berlin Monday-first ordering, US Sunday-first locale fallback, and German Monday-first locale fallback.

## Next Steps
No follow-up work is required. `instructions/ISSUES.md` is not present in this checkout, so no roadmap item was updated.
