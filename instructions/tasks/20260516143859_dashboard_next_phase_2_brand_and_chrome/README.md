# Task: Dashboard Next Phase 2 Brand and Chrome

## Status

- [x] Defined
- [x] In Progress
- [x] Completed

## Description

Implement Phase 2 of the dashboard rewrite for `web/dashboard-next`: brand asset candidates, expanded design-system primitives, and the first mobile-first application chrome.

This phase must keep generated brand assets as review candidates. It must not silently adopt a final logo or illustration set.

## User Story / Requirement

As a project maintainer, I want concrete brand and shell candidates for the new dashboard so the team can judge the orange-white visual direction before migrating real product flows.

As a dashboard user, I want the new shell to feel clear on mobile first, with predictable navigation, reusable controls, and calm transitions.

## Context

- Rewrite plan: `instructions/tasks/20260516105903_dashboard_ux_ui_rewrite_plan/README.md`.
- New app: `web/dashboard-next`.
- Previous phase task: `instructions/tasks/20260516125949_dashboard_next_phase_1_foundation/README.md`.
- Phase 2 scope from the plan:
  - Generate multiple logo mark candidates.
  - Generate dashboard illustration candidates in the same orange-white style.
  - Save candidates under the new app workspace.
  - Expand reusable UI primitives and Storybook coverage.
  - Implement mobile-first shell, navigation, language switcher, route title area, responsive drawer/sheet behaviour, toast surface, and global empty/loading/error states.
  - Use Angular `animate.enter` and `animate.leave` for new enter/leave motion.

## Permissions

No backend permissions are introduced or changed. This phase remains frontend-only.

## Testing Decision

Add focused tests for shell state and representative UI primitives where behaviour is introduced. Continue using Angular's Vitest-based `ng test` target. Add or update Storybook stories for the new primitives and shell states.

## Loading State Assessment

This phase introduces reusable loading and empty-state primitives but does not load live product data. Loading states should remain skeleton-based and should not use visible loading text for content placeholders.

## Brand Review Notes

- Generated logo and illustration sheets are saved as candidate assets only.
- The first logo mark in `logo-candidate-sheet-01.png` is the preferred direction based on maintainer feedback.
- The preferred top-left logo mark has been cropped, flattened to the orange palette, and exported as transparent production-candidate assets under `web/dashboard-next/src/assets/brand/mark/`.
- The generated illustration sheet is accepted as directionally good, but no individual illustration is selected or wired into production UI yet.
- Lighter WebP preview sheets are saved for Storybook so local review does not depend on loading the full original PNG source sheets.

## Acceptance Criteria

- [x] Logo candidates are generated and saved in the new app workspace.
- [x] Illustration candidates are generated and saved in the new app workspace.
- [x] Candidate assets are not wired in as final production branding.
- [x] The shell includes mobile-first navigation and a responsive drawer/sheet pattern.
- [x] The shell includes a user menu area and language switcher control.
- [x] The shell includes a route title/header area.
- [x] The app has reusable primitives for button, icon button, badge, tabs/segmented control, toast, empty state, and skeleton/loading placeholders.
- [x] New enter/leave motion uses Angular `animate.enter` / `animate.leave` with native CSS classes.
- [x] Storybook covers new primitives and key states.
- [x] Focused tests cover new state or behaviour.
- [x] `make web-next:build` passes.
- [x] `make web-next:test` passes.
- [x] `make web-next:storybook:build` passes.
