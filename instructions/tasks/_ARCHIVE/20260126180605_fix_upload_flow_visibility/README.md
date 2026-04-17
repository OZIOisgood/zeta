# Fix Upload Flow Visibility

## Status

- [x] Defined
- [x] In Progress
- [x] Completed

## Description

Currently, when a user starts a file upload to Mux storage but aborts it (or it fails), an incomplete asset is created in the database and is immediately visible on the home page. This results in "half-completed" assets cluttering the user's dashboard.

The goal is to hide these assets until the upload is fully completed.

## Context

- `migrations/20260122000001_create_assets_videos.up.sql`
- `internal/assets/handler.go`
- `web/dashboard/src/app/pages/upload-video-page/upload-video-page.component.ts`

## Acceptance Criteria

- [x] Assets initiated but not fully uploaded should be in a `waiting_upload` state.
- [x] `waiting_upload` assets should not be listed in the main feed.
- [x] Upon successful upload of all files, the frontend triggers a completion action.
- [x] Backend updates status to `pending`, making the asset visible.
