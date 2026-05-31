# Task: Dashboard Next Phase 5 Live Coaching Flows

## Status

- [x] Defined
- [x] In Progress
- [x] Completed

## Description

Record and verify the Phase 5 implementation for `web/dashboard-next`: the mobile-first live coaching surfaces that were implemented after Phase 4 without a dedicated task folder.

This task is retrospective documentation for code already present in the repository. It preserves the implementation history required by `instructions/TASK_CONSTITUTION.md` before Phase 6 begins.

## User Story / Requirement

As a dashboard user, I want to review, book, manage, join, and cancel live coaching sessions in the rewritten dashboard so the established coaching workflow remains available with a clearer mobile-first interface.

As an expert, I want to manage session types, recurring availability, and blocked slots without losing the behavior of the current dashboard.

## Context

- Rewrite plan: `instructions/tasks/20260516105903_dashboard_ux_ui_rewrite_plan/README.md`.
- Previous phase: `instructions/tasks/20260516170732_dashboard_next_phase_4_core_video_group_flows/README.md`.
- New app: `web/dashboard-next`.
- Behaviour reference: `web/dashboard/src/app/pages/my-sessions-page/`, `book-coaching-page/`, `manage-availability-page/`, and `video-call-page/`.
- Rewritten pages: `web/dashboard-next/src/app/pages/sessions/`, `book-coaching/`, `manage-availability/`, and `video-call/`.
- Rewritten stores: `web/dashboard-next/src/app/features/sessions/`.

## Permissions

No backend permissions were introduced or changed. The rewritten UI reuses the existing coaching permission set:

- `coaching:book`
- `coaching:availability:manage`
- `coaching:bookings:read`
- `coaching:video:connect`

## Testing Decision

Focused NgRx Signal Store tests are appropriate for booking-date grouping, booking cancellation, and async error handling. Existing app build and test verification covers the routed page compilation. Full end-to-end Agora validation remains a manual integration concern because it requires authenticated participants and a live call environment.

## Loading State Assessment

The live coaching pages load asynchronous booking, group, expert, session-type, slot, availability, blocked-slot, and connection data. Content placeholders use skeleton states or empty/error surfaces rather than visible loading-status text.

## Acceptance Criteria

- [x] The sessions hub exposes upcoming, past, and cancelled session states.
- [x] Booking supports group, expert, session type, date, slot, and confirmation steps.
- [x] Booking date grouping uses the user's local date rather than UTC-only day boundaries.
- [x] Experts can manage session types, recurring availability, and blocked slots.
- [x] Users can cancel eligible bookings with an optional cancellation reason.
- [x] Join-call affordances appear for connectable bookings.
- [x] The full-screen video call route remains outside the application chrome.
- [x] Agora connection and recording lifecycle integration remain represented in the rewritten call page.
- [x] Async content placeholders use skeletons or empty/error states.
- [x] Focused coaching store tests exist.
