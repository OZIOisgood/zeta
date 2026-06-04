# Resolution

## Summary
Created and completed the phased plan for the Angular dashboard UX/UI rewrite. The implementation phases now culminate in deployment automation building `web/dashboard-next` for the dashboard service while preserving the folder name for branch coordination.

## Technical Details
- Captured the durable rewrite requirements in `README.md` so future sessions can continue after context compaction.
- Documented a phased migration from the current Taiga UI and ngx-translate dashboard to a new mobile-first dashboard using Tailwind CSS, Angular Primitives, Transloco, NgRx Signal Store, Storybook, and Angular `animate.enter` / `animate.leave`.
- Recorded the need to keep the new dashboard beside the old dashboard until route cutover is complete.
- Recorded testing strategy based on Angular CLI's current Vitest-based unit test setup, with Storybook interaction tests for reusable UI and optional browser-backed Vitest for rendering-sensitive cases.
- Recorded email-template alignment as a dedicated phase.
- Recorded backend considerations as phase-level planning items instead of making backend changes during this planning session.
- Noted that the root `ISSUES.md` referenced by the constitution was not present in this checkout.
- Updated the plan after stakeholder clarification: the rewrite is now a separate Angular app under `web/`, intended to replace the old dashboard in deployment.
- Changed Storybook to local-only for the main rewrite, with possible deployment deferred.
- Deferred visual regression testing as an optional future enhancement.
- Updated the design direction to an orange-white palette.
- Added future logo and illustration generation requirements, including candidate review before production adoption.
- Recorded that `instructions/CONSTITUTION.md` should be updated during final cutover rather than before Phase 1.
- Completed Phase 7 with a constrained cutover: CI and deployment workflows now build `web/dashboard-next`, Docker/nginx packaging exists inside `web/dashboard-next`, legacy `web:*` Makefile commands were removed, and `web-next:*` commands remain unchanged.
- Kept `web/dashboard` in the repository because dependent development branches still use this rewrite branch as their base.
- Deferred deleting old dashboard source and legacy dependencies until branch coordination allows it.

## Verification
- [x] Build passed
- [x] Verified in automation configuration

Current cutover verification is recorded in the Phase 7 task resolution. Manual infrastructure action and deployment are intentionally left to the maintainer.
