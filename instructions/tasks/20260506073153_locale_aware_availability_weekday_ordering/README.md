# Task: Locale-Aware Availability Weekday Ordering

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
As an expert managing coaching availability, I want the "Day" dropdown in the availability dialog to start with the first day of the week that matches my configured environment, so that users in Berlin and similar Monday-first regions see Monday before Sunday.

## Context
- `web/dashboard/src/app/pages/manage-availability-page/manage-availability-page.component.ts`
- `web/dashboard/src/app/pages/manage-availability-page/ui/availability-dialog/availability-dialog.component.ts`
- `web/dashboard/src/app/shared/services/auth.service.ts`
- `web/dashboard/src/app/shared/utils/weekdays.ts`

## Permissions
This change reuses the existing manage availability flow and does not require new permissions.

## Test Decision
Automated tests are required because weekday ordering is locale-sensitive presentation logic and can regress without visible TypeScript errors.

## Acceptance Criteria
- [x] The availability dialog orders day options with Monday first for `Europe/Berlin`.
- [x] Existing `day_of_week` values remain unchanged.
- [x] The dashboard build passes.
