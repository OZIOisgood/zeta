# Resolution

## Summary
- Added a home-page First steps component that presents a concise checklist for users who have no home content yet.
- Replaced the initial stacked empty-state experience with the First steps component when there are no videos and no upcoming sessions.
- Preserved the existing coaching session and latest video sections for users who already have content.

## Technical Details
- The home page now tracks the full videos response, readable groups, and upcoming bookings with Angular signals.
- First-step items are derived from existing permissions and route users to the relevant setup pages.
- The component is scoped under `web/dashboard/src/app/pages/home-page/ui/first-steps` because it is currently specific to the home onboarding experience.
- No backend or permission changes were required.

## Verification
- [x] Ran `make web:build`.
- [x] Ran `cd web/dashboard && pnpm run test`.
- [x] Started the dashboard with `cd web/dashboard && pnpm exec ng serve --host 0.0.0.0 --port 4200`.
- [x] Reviewed the generated template and styles for the no-content and content-present branches.

## Tests
- No new automated tests were added because this is a focused presentation change covered by Angular template/type compilation.

## Next Steps
- None.
