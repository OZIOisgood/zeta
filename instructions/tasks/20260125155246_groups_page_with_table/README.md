# Task: Groups Page with Table

## Status
- [ ] Defined
- [ ] In Progress
- [x] Completed

## Description
As a user, I want to have the ability to see a table (using Taiga UI table) on a groups page to see all my groups.
As a developer, I expect the DB to have a groups table and the user-group relationship table.

## Context
- The `groups` feature flag is already mentioned in the main README.
- Frontend logic should reside in `web/dashboard/src/app/pages/groups-page`.

## Acceptance Criteria
- [x] Database migration created for `groups` and `user_groups` tables.
- [x] Backend returns list of groups for the user.
- [x] Frontend page displays groups in a Taiga UI table.
- [x] Main `README.md` updated.
