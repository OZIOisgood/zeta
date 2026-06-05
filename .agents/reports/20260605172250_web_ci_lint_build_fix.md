---
title: Web CI Lint Build Fix
date: 2026-06-05
---

## Context

The branch failed `CI / Lint & Build Web (pull_request)` because `make web-next:lint`
reported Prettier formatting drift in dashboard files.

## Decision

Apply the repository Prettier configuration to the affected dashboard files only.

## Files Touched

- `web/dashboard-next/src/app/**/*.ts`
- `web/dashboard-next/src/app/shared/ui/**/*.ts`

## Verification

- `make web-next:lint`
- `make web-next:build`

The build completed with existing bundle/CommonJS warnings.
