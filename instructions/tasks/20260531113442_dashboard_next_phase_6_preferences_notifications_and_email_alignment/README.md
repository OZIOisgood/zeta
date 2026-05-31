# Task: Dashboard Next Phase 6 Preferences, Notifications, and Email Alignment

## Status

- [x] Defined
- [x] In Progress
- [x] Completed

## Description

Implement Phase 6 of the dashboard rewrite for `web/dashboard-next`: migrate the personal preferences and notification settings flow from the current dashboard, persist language changes through the Transloco-aware session path, and align embedded transactional email templates with the orange-white Zeta visual system.

The current dashboard remains the behaviour reference. This phase improves presentation and reusable UI composition without inventing a new preferences workflow.

## User Story / Requirement

As a dashboard user, I want to update my profile, avatar, language, timezone, and relevant notification preferences in the rewritten dashboard so my existing account controls remain available in the improved interface.

As an email recipient, I want transactional emails to visually match the rewritten dashboard while remaining robust across email clients.

## Context

- Rewrite plan: `instructions/tasks/20260516105903_dashboard_ux_ui_rewrite_plan/README.md`.
- Previous phase record: `instructions/tasks/20260531113441_dashboard_next_phase_5_live_coaching_flows/README.md`.
- New app: `web/dashboard-next`.
- Current dashboard behaviour reference: `web/dashboard/src/app/pages/user-preferences-page/`.
- Existing reusable Zeta controls: `web/dashboard-next/src/app/shared/ui/`.
- Existing preferences API client: `web/dashboard-next/src/app/core/http/auth-api.service.ts`.
- Existing session store: `web/dashboard-next/src/app/features/session/session.store.ts`.
- Existing email templates: `internal/email/templates/`.
- Email preview command: `make email:preview`.
- Angular Primitives LLM docs reviewed for `Checkbox`, `Combobox`, `Input`, `Select`, `Tabs`, `Avatar`, and `Toast`.

## Permissions

No backend permissions are introduced or changed. The personal preferences route is available to an authenticated user. Notification category visibility reuses existing permissions from `internal/permissions/permissions.go`:

- `groups:create`
- `assets:create`
- `groups:invites:create`
- `coaching:bookings:read`

## Testing Decision

Add focused Session Store and preferences component tests for user update persistence, Transloco-aware language/timezone updates, route tab behavior, and notification controls. Update the existing Go email renderer test to assert the refreshed primary visual token. Run the existing email renderer suite because template CSS changes affect all transactional emails.

## Loading State Assessment

The preferences form depends on the authenticated session loaded by `SessionStore`. The shell guard already waits for authentication. Saving is a form mutation, so the save action uses a disabled/submitting state rather than a content skeleton. No page-section loading text is introduced.

## Angular Primitives Assessment

- Reuse the existing `ZAvatarInputComponent` for image selection and compression.
- Reuse the select-like button-only `ZComboboxComponent`, backed by `ng-primitives/combobox`, for language and timezone selection.
- Add a small reusable checkbox wrapper backed by `ng-primitives/checkbox`.
- Add a select-like button-only combobox wrapper backed by `ng-primitives/combobox` for the timezone list.
- Add a shared tabs wrapper backed by `ng-primitives/tabs` for page-level view navigation.
- Add avatar wrappers backed by `ng-primitives/avatar` for identity surfaces.
- Use the `ng-primitives/interactions` hover directive for animated video previews without interfering with scroll gestures.
- Keep the existing segmented control for genuinely compact toggle groups rather than page-level content sections.

## Acceptance Criteria

- [x] Routes exist for `/preferences/personal-data` and `/preferences/email-preferences`.
- [x] The shell preferences action opens the rewritten preferences page.
- [x] Personal preferences preserve first name, last name, language, timezone, and avatar behavior from the current dashboard.
- [x] Email preferences preserve the master toggle and permission-relevant notification category controls.
- [x] Saving preferences updates the authenticated Session Store user.
- [x] Saving preferences applies the selected language and timezone through the Transloco-aware localization service.
- [x] New shared checkbox and timezone combobox controls use Angular Primitives.
- [x] Dashboard translations are updated for English, German, and French where needed.
- [x] Transactional email CSS uses the orange-white Zeta visual system while keeping table-based, email-client-safe markup.
- [x] Local email previews are regenerated.
- [x] Focused dashboard and email tests pass.
- [x] `make web-next:build` passes.
- [x] `make web-next:test` passes.
- [x] `make web-next:storybook:build` passes.
- [x] `make email:preview` passes.
- [x] `make api:build` passes.
- [x] `make web:build` passes for the legacy dashboard regression check.

## Follow-Up UX Refinements

- [x] Successful preference saves use the shell toast surface instead of adding an inline success card to the form.
- [x] The navbar user menu no longer duplicates language selection from the preferences page.
- [x] Page-level content selectors use a consistent flat tab bar with an active underline below the page header.
- [x] Sessions, Videos, Preferences, Availability, and Group Preferences use the shared Angular Primitives-backed tabs component.
- [x] Counted tabs render counts as compact badges instead of embedding them in labels.
- [x] Latest Videos and All My Videos reuse a hover preview that swaps the static thumbnail for the backend-generated animated GIF without intercepting page scrolling.
- [x] My Groups and Manage Availability reuse the same top-aligned, description-clamped group card.
- [x] Completed First Steps no longer reserve a dashboard sidebar column.
- [x] The navbar user menu shows an avatar beside the user's name and email.
- [x] Group Preferences matches the user-preferences page hierarchy and does not reload group data when only the active tab changes.
- [x] Reopening the booking page after a completed booking starts a fresh flow instead of showing the previous confirmation.
- [x] Editing an asset review preserves the current dashboard's AI text-enhancement action.
- [x] Language and timezone use the same button-only combobox treatment on Personal Data.
- [x] Asset details show a linked group identity with the group's avatar.
