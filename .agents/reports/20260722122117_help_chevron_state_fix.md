# Help chevron state fix

## Context

The Help menu chevron appeared expanded while the menu was closed, and its prior rotation rule did not match the rendered Angular DOM.

## Decision

Use the disclosure convention of a right-facing chevron when closed and rotate it down when the menu trigger exposes `data-open`. Target the rendered `button[data-open]` attribute instead of the non-rendered directive name.

## Files touched

- `web/dashboard-next/src/app/shared/ui/dropdown-menu/z-dropdown-menu.component.ts`
- `web/dashboard-next/src/app/shared/ui/dropdown-menu/z-dropdown-menu.component.spec.ts`

## Verification

- Focused dropdown-menu unit test: passed.
- Full frontend test suite: 45 files, 154 tests passed.
- Frontend lint/Prettier check: passed.
- Production dashboard build: passed with existing bundle/CommonJS warnings.
- Storybook build: passed with existing asset-size warnings.

## Follow-ups

None.
