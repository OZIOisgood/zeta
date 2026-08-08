# Availability tab loading

## Context

Ticket #15 reports that changing tabs on a group's Manage Availability page shows a skeleton, unlike the Sessions page.

## Decision and scope

- Keep all three availability datasets loaded for the selected group and switch tabs locally.
- Prevent a tab-only route change from reloading group configuration.
- Audit other dashboard tab pages for the same behavior; keep successfully loaded invite codes cached when returning to their Preferences tab.
- Add a focused regression test.

## Verification

- Focused component test.
- `make web-next:lint`.
- `make web-next:build`.
