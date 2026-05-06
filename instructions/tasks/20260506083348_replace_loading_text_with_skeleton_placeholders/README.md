# Task: replace loading text with skeleton placeholders

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
Replace visible dashboard loading text with skeleton placeholders so asynchronous content loading follows the established Taiga UI skeleton approach.

## Context
- The dashboard uses Angular with Taiga UI.
- `instructions/CONSTITUTION.md` requires dashboard pages to follow existing page patterns.
- No new permissions are required; this is a frontend presentation change only.
- `instructions/ISSUES.md` is referenced by the constitution but is not present in this checkout.

## Test Assessment
- No new automated tests are required because the change is presentational and does not alter component state transitions, service calls, permissions, or data contracts.
- A dashboard build is required by the project constitution.

## Acceptance Criteria
- [x] No visible content-loading status copy remains in dashboard templates.
- [x] Existing loading states render skeleton placeholders instead.
- [x] The project and task constitutions document the skeleton-loading convention.
- [x] `make web:build` succeeds.
