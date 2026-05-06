# Task: Add Videos Page and Recent Videos on Home

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
As an authenticated user, the dashboard should provide a dedicated Videos page that displays all visible videos. The Home page should display only the latest videos and provide a clear action to navigate to the complete list.

## Permissions

This task reuses the existing asset visibility and upload permissions. No new permissions are required.

- Video listing continues to use the existing `/assets` API visibility rules.
- The upload card continues to be controlled by the existing `assets:create` permission.

## Context
- `web/dashboard/src/app/pages/home-page/`
- `web/dashboard/src/app/shared/components/asset-list/`
- `web/dashboard/src/app/shared/components/navbar/`
- `web/dashboard/src/app/core/app.routes.ts`

## Automated Test Assessment

The change is a dashboard routing and composition update using existing services and list rendering. No new automated tests are required because no new business logic or API contract is introduced. The required verification is the dashboard build.

## Loading State Assessment

The change touches asynchronous asset list loading. It continues to use the existing Taiga UI skeleton placeholders from `AssetListComponent` and avoids visible loading text.

## Acceptance Criteria
- [x] A dedicated Videos page displays the full visible asset list.
- [x] The Home page displays only the latest visible videos.
- [x] The Home page provides a View all action that navigates to the Videos page.
- [x] The navbar includes a Videos link immediately after Home.
- [x] `make web:build` succeeds.
