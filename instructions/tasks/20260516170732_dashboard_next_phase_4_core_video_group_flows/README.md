# Task: Dashboard Next Phase 4 Core Video and Group Flows

## Status

- [x] Defined
- [x] In Progress
- [x] Completed

## Description

Implement Phase 4 of the dashboard rewrite for `web/dashboard-next`: introduce the route/page structure and first usable mobile-first video and group flows on top of the Phase 3 Transloco and NgRx Signal Store foundation.

This phase should keep the old dashboard available as a behaviour reference, but new code must remain Taiga-free and must continue using Tailwind, Angular Primitives-backed Zeta UI components, Transloco, and NgRx Signal Store.

This phase is intentionally a first migration slice of the broad Phase 4 scope. It should establish the new app route architecture and cover the core list/detail/create surfaces well enough for later phases to deepen review comments, QR invitation handling, member management, and upload transport.

## User Story / Requirement

As a dashboard user, I want the new dashboard to show real video and group routes with clear list, empty, error, and detail states so I can recognize the main product flows in the new mobile-first UI.

As a maintainer, I want the root shell separated from page content and the first feature pages wired through stores and API clients so later video review and group invitation work has a stable place to land.

## Context

- Rewrite plan: `instructions/tasks/20260516105903_dashboard_ux_ui_rewrite_plan/README.md`.
- Phase 3 task: `instructions/tasks/20260516164912_dashboard_next_phase_3_transloco_state_foundation/README.md`.
- New app: `web/dashboard-next`.
- Old route reference: `web/dashboard/src/app/core/app.routes.ts`.
- Old page references:
  - `web/dashboard/src/app/pages/home-page/`
  - `web/dashboard/src/app/pages/videos-page/`
  - `web/dashboard/src/app/pages/asset-details-page/`
  - `web/dashboard/src/app/pages/upload-video-page/`
  - `web/dashboard/src/app/pages/groups-page/`
  - `web/dashboard/src/app/pages/group-details-page/`
  - `web/dashboard/src/app/pages/create-group-page/`
  - `web/dashboard/src/app/pages/group-preferences-page/`
- Product terminology rule: user-facing copy says **video**; API/data code keeps `asset` for the reviewable parent entity.

## Permissions

No backend permissions are introduced or changed. The new dashboard uses route affordances and page copy that can later be permission-gated by the Phase 3 session store and backend permissions.

## Testing Decision

Add focused component tests for the new routed pages and store-derived UI states. Do not pursue full coverage. Continue using Angular CLI's Vitest-based `ng test` target.

## Loading State Assessment

This phase renders async content from stores. Content loading states must use skeleton placeholders and avoid visible loading-status text for page sections, lists, cards, and detail panels.

## Acceptance Criteria

- [x] The root app shell renders route content through `router-outlet` instead of hard-coded home content.
- [x] New routes exist for Home, Videos, Video details, Upload video, Groups, Group details, Create group, and Group preferences.
- [x] Navigation selects the matching section when route links are used.
- [x] Home shows a dashboard summary using the video, group, and session stores.
- [x] Videos page shows loading, error, empty, filtered, and populated states.
- [x] Video details page uses backend/API `asset` identifiers in code while rendering user-facing **video** copy.
- [x] Upload video page captures file, details, and group selection with a mobile-first step pattern.
- [x] Groups page shows loading, error, empty, and populated states.
- [x] Group details page shows group header/details and placeholders for members/invitation surfaces.
- [x] Create group and group preferences pages provide usable forms/placeholders wired to current API clients where reasonable.
- [x] Storybook covers major page/list states introduced in this phase.
- [x] Focused tests cover page rendering and store-driven interactions.
- [x] Backend/API gaps discovered during this phase are documented.
- [x] `make web-next:build` passes.
- [x] `make web-next:test` passes.
- [x] `make web-next:storybook:build` passes.
- [x] `make web:build` passes for legacy dashboard regression.
