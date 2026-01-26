# Task: add owner id to group entity

## Status

- [ ] Defined
- [ ] In Progress
- [x] Completed

## Description

Add `owner_id` to the `group` entity in the database and Go structs. It was forgotten during initial creation.

## Context

- `db/migrations/20260125000000_create_groups.up.sql` needs update.
- `internal/db` models and queries need update.
- `internal/groups/handler.go` needs update to save `owner_id`.
- `web/dashboard/src/app/shared/services/groups.service.ts` needs update to reflect the change.

## Acceptance Criteria

- [x] `groups` table has `owner_id` column.
- [x] `CreateGroup` handler saves `owner_id`.
- [x] `ListUserGroups` returns `owner_id`.
- [x] Frontend `Group` interface includes `owner_id`.
- [x] API and Web builds pass.
