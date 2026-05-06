# Task: Configure Air Live Reload for API

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
As a backend developer, I need a project-supported way to run the Go API with live reload so that local development does not require manually restarting `go run ./cmd/api` after every source change.

The implementation should use `github.com/air-verse/air` in a project-local manner, avoiding a global installation prerequisite for contributors.

## Permissions
No new permissions are required. This task changes local development tooling only.

## Context
- `Makefile`
- `README.md`
- `go.mod`
- `.air.toml`

The existing `make api:start` target runs the API once with `go run ./cmd/api`. The new live-reload workflow should complement that target without changing production runtime behavior.

## Test Assessment
No new automated tests are required because this change only adds a local developer tooling command and does not alter application behavior, API contracts, permissions, database schema, or dashboard UI.

## Loading State Assessment
This task does not touch dashboard asynchronous content loading states.

## Acceptance Criteria
- [x] The repository includes an Air configuration for the Go API.
- [x] Developers can start the API with live reload through a Makefile target.
- [x] The Air tool is tracked through Go project tooling rather than requiring a global install.
- [x] Root README setup instructions mention the live-reload command.
- [x] `make api:build` succeeds.
