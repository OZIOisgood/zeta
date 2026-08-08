# Availability tab loading completion

## Context

Ticket #15 reported a skeleton flash whenever a tab changed on Manage Availability for a selected group.

## Decision

- Availability route changes now reload data only when the group ID changes; tab-only changes reuse the group's already-loaded configuration, matching Sessions.
- Returning to Preferences > Invite Codes now reuses successfully loaded codes. Idle and failed loads still fetch, preserving initial loading and retry behavior.
- The remaining tabbed pages were audited and already switch cached/local data without refetching on tab changes, so no shared tabs refactor was needed.

## Files touched

- `web/dashboard-next/src/app/pages/manage-availability/manage-availability-page.component.ts`
- `web/dashboard-next/src/app/pages/manage-availability/manage-availability-page.component.spec.ts`
- `web/dashboard-next/src/app/pages/invite-codes/invite-codes-section.component.ts`
- `web/dashboard-next/src/app/pages/invite-codes/invite-codes-section.component.spec.ts`
- `.agents/plans/20260722144613_availability_tab_loading.md`

## Verification

- Focused Angular tests: 2 files, 7 tests passed.
- `make web-next:lint`: passed.
- `make web-next:build`: passed with the repository's existing bundle-budget and CommonJS warnings.

## Follow-ups

- None for ticket #15.
