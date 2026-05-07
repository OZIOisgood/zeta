# Task: use secondary appearance for small secondary buttons

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
As a dashboard user, I want secondary and supportive actions to use the Taiga UI `secondary` appearance consistently, so that small navigation, management, and cancellation controls have a stable visual hierarchy across pages and dialogs.

The change covers actions such as View all links, icon-only management buttons, group settings and invite buttons, stepper Back buttons, dialog Cancel or Decline buttons, and comparable small secondary controls.

## Permissions

This is a dashboard presentation change. No permissions are added or changed.

## Context
- `web/dashboard/src/app/pages/`
- `web/dashboard/src/app/shared/components/`
- Taiga UI button appearances.

## Test Assessment

This change is visual and declarative. No business logic or data transformation is introduced, so automated unit tests are not required. The dashboard build is required to verify template validity.

## Loading State Assessment

This change does not introduce or modify asynchronous content loading behavior. Existing skeleton placeholders remain unchanged.

## Acceptance Criteria
- [x] Small secondary actions use `appearance="secondary"` instead of `appearance="flat"`.
- [x] Dialog cancel and decline actions use `secondary`.
- [x] Stepper Back actions use `secondary`.
- [x] Primary and destructive actions keep their existing appearances.
- [x] The dashboard build passes.
