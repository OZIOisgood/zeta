# Task: Rename `upload-video` feature to `assets--create`

## Status

- [x] Defined
- [x] In Progress
- [x] Completed

## Description

The `upload-video` feature slug needs to be updated to `assets--create` to match the change made in WorkOS dashboard.
Everything else (routes, component names, filenames) should remain as `upload-video`. Only the feature flag string itself is changing.

## Context

- `internal/assets/handler.go`
- `web/dashboard/src/app/shared/services/feature.service.ts`
- `web/dashboard/src/app/pages/home-page/home-page.component.ts`
- `web/dashboard/src/app/core/app.routes.ts`
- `web/dashboard/src/app/shared/components/navbar/navbar.component.ts`

## Acceptance Criteria

- [x] Feature flag check in Backend uses `assets--create`
- [x] Feature flag type in Frontend includes `assets--create` instead of `upload-video`
- [x] Frontend feature checks use `assets--create` string
- [x] Application builds and functionality remains the same
