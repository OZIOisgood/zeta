# Task: Dashboard Next Phase 1 Foundation

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
Create the Phase 1 foundation for the dashboard rewrite as a new Angular application under `web/`, beside the current `web/dashboard` application.

This phase implements only the new application foundation. It must not migrate existing dashboard flows or remove Taiga UI from the old dashboard.

## User Story / Requirement

As a project maintainer, I want a separate Angular application for the new dashboard so the team can build and verify the replacement UI independently while using the existing dashboard as a behavioural reference.

## Context
- Planning task: `instructions/tasks/20260516105903_dashboard_ux_ui_rewrite_plan/README.md`.
- Current dashboard: `web/dashboard`.
- New dashboard target: `web/dashboard-next`.
- The new app must use Tailwind CSS, Angular Primitives, Transloco, NgRx Signal Store, and local Storybook.
- Storybook deployment and visual regression testing are deferred options, not Phase 1 scope.
- `instructions/CONSTITUTION.md` still names Taiga UI for the current dashboard. Per the planning task, that constitution section is updated during final cutover, not in this phase.

## Permissions

No backend permissions are introduced or changed in this phase. The new application foundation does not call protected API endpoints yet.

## Testing Decision

This phase must add a minimal automated test path for the new app. Angular CLI's Vitest-based unit test target is sufficient for the shell and configuration smoke tests in this phase. Storybook must be configured locally and verified through a build command.

## Loading State Assessment

This phase does not implement asynchronous product data loading. It may add static skeleton components or stories for future loading states, but no live page loading states are introduced.

## Acceptance Criteria
- [x] A new Angular application exists under `web/dashboard-next`.
- [x] The old `web/dashboard` application remains untouched as a reference implementation.
- [x] Tailwind CSS is configured for the new app.
- [x] Transloco is configured for the new app with English seed translations.
- [x] NgRx Signal Store is installed and a small foundation store pattern exists.
- [x] Angular Primitives is installed and used by at least one foundation UI component where suitable.
- [x] Storybook is configured as a local tool with initial stories.
- [x] A minimal mobile-first shell renders without Taiga UI.
- [x] New local run/build/test/storybook commands are documented or scripted.
- [x] New app build passes.
- [x] New app tests pass.
- [x] Storybook build passes.
