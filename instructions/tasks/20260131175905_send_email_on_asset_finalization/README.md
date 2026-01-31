# Task: Send Email on Asset Finalization

## Status

- [ ] Defined
- [ ] In Progress
- [x] Completed

## Description

As a video owner, I want to receive an email notification when my video has been reviewed and finalized, so that I know it is approved.

## Context

When an asset is finalized via `POST /assets/{id}/finalize`, the system updates the status to `completed`. We need to add an email notification step here using `internal/email` service and `workos-go/usermanagement` to fetch owner details.

## Acceptance Criteria

- [x] Email is sent to the owner on finalization.
- [x] Logic handles fetching asset owner and their email.
- [x] Logging is added for success and failure cases.
