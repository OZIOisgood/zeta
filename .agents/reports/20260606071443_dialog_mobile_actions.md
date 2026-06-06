# Dialog Mobile Actions

## Context

Mobile dialog action buttons could wrap awkwardly or render as narrow inline buttons even when stacked.

## Decision

Added opt-in button classes for mobile full-width layout and no-wrap labels, then applied them to shared dialog actions and the group invitation dialog's custom footers.

## Files Touched

- `web/dashboard-next/src/app/shared/ui/button/z-button.component.ts`
- `web/dashboard-next/src/app/shared/ui/dialog/z-action-dialog.component.ts`
- `web/dashboard-next/src/app/pages/group-details/group-invitation-dialog.component.ts`

## Verification

- `make web-next:lint`
- `make web-next:build`
- `make web-next:storybook:build`

Builds completed successfully. Existing bundle size/CommonJS warnings remain.

## Follow-ups

- None.
