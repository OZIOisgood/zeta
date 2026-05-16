# Resolution

## Summary
Created a task plan for the Angular dashboard UX/UI rewrite. No dashboard implementation was started, in accordance with the requested planning boundary.

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

## Verification
- [ ] Build passed
- [ ] Verified in UI/API

Build and UI verification were not run because this session intentionally created only planning documentation and did not modify production code.
