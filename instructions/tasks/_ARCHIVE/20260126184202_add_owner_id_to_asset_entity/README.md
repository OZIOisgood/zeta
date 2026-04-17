# Add owner_id to asset entity

## Status

- [ ] Defined
- [ ] In Progress
- [x] Completed

## Description

Add `owner_id` to asset entity.
We have forgotten to add it when created an asset entity.

## Context

- This is a follow-up to `instructions/tasks/20260122190000_implement_video_upload_flow`.

## Acceptance Criteria

- [x] `assets` table has `owner_id` column.
- [x] `Asset` struct in Go has `OwnerID` field.
- [x] Asset creation logic includes `owner_id`.
