# Task: Dashboard Next Phase 3 Transloco and State Foundation

## Status

- [x] Defined
- [x] In Progress
- [x] Completed

## Description

Implement Phase 3 of the dashboard rewrite for `web/dashboard-next`: migrate the dashboard translation corpus into Transloco and establish the feature-state foundation with NgRx Signal Store.

This phase must not rebuild full product pages. It should prepare the reusable localization, API-client, async-state, and store patterns that later phases will use for videos, groups, live coaching, and preferences.

## User Story / Requirement

As a project maintainer, I want the new dashboard to have the same translation coverage and a clear Signal Store pattern before feature pages are rebuilt, so future phases can migrate flows without re-solving localization and async state.

As a dashboard user, I want language selection and translated shell labels to work in the new app before real workflow pages are added.

## Context

- Rewrite plan: `instructions/tasks/20260516105903_dashboard_ux_ui_rewrite_plan/README.md`.
- Phase 2 task: `instructions/tasks/20260516143859_dashboard_next_phase_2_brand_and_chrome/README.md`.
- New app: `web/dashboard-next`.
- Old translation source: `web/dashboard/public/i18n/en.json`, `de.json`, and `fr.json`.
- Old i18n service reference: `web/dashboard/src/app/shared/i18n/dashboard-i18n.service.ts`.
- Old API-client references:
  - `web/dashboard/src/app/shared/services/auth.service.ts`
  - `web/dashboard/src/app/shared/services/asset.service.ts`
  - `web/dashboard/src/app/shared/services/groups.service.ts`
  - `web/dashboard/src/app/shared/services/coaching.service.ts`
  - `web/dashboard/src/app/shared/interceptors/credentials.interceptor.ts`

## Permissions

No backend permissions are introduced or changed. This phase remains frontend-only and records API shape concerns if they appear.

## Testing Decision

Add focused tests for localization language resolution/selection and representative Signal Store async behaviour. Reuse Angular CLI's Vitest-based `ng test` target.

## Loading State Assessment

This phase establishes async loading/error state in stores but does not render new live data pages. UI loading placeholders remain skeleton-based in the shell, with no visible loading-status text for content placeholders.

## Acceptance Criteria

- [x] Old dashboard translation JSON is migrated into `web/dashboard-next` Transloco files for English, German, and French.
- [x] Phase 2 shell/design-system keys remain available in all supported locales.
- [x] Transloco config supports `en`, `de`, and `fr`.
- [x] A dashboard localization service resolves browser language, updates document language, and changes Transloco active language.
- [x] The shell language switcher supports English, German, and French.
- [x] New API-client classes in `web/dashboard-next` preserve backend/API `asset` naming and use user-facing "video" only in translation/UI copy.
- [x] A reusable async state pattern is established for feature stores.
- [x] Representative NgRx Signal Stores are added for session/auth, videos, groups, and sessions overview.
- [x] Store tests cover success and error paths for representative async state.
- [x] Transloco/localization tests prove language selection works.
- [x] `make web-next:build` passes.
- [x] `make web-next:test` passes.
- [x] `make web-next:storybook:build` passes.
- [x] `make web:build` passes for legacy dashboard regression.
