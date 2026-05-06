# Task: Align User-Facing Asset and Video Terminology

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
Audit user-facing copy for confusion between the technical `asset` model and product-facing video terminology. Update clear product-copy leaks while preserving technical identifiers, routes, permissions, logs, and database/API field names.

## Permissions

No permission changes are required. This task changes user-facing strings only.

## Context
- `instructions/CONSTITUTION.md`
- `internal/assets/handler.go`
- `internal/reviews/handler.go`
- `web/dashboard/src/app/`

## Automated Test Assessment

Backend response and email subject strings are changing, so backend build and focused package tests should be run. No new automated tests are required because existing tests cover the affected handlers at the status-code level and the change does not alter behavior.

## Loading State Assessment

This task does not touch dashboard asynchronous loading states.

## Acceptance Criteria
- [x] User-facing emails do not expose the term `asset`.
- [x] User-facing API error strings in asset/review flows use video terminology.
- [x] Technical code identifiers, routes, logs, and permissions remain aligned with the existing DB/API model.
- [x] Required build verification passes.
