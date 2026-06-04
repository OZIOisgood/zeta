# Task: Dashboard Next Phase 7 Deployment Cutover Cleanup

## Status

- [x] Defined
- [x] In Progress
- [x] Completed

## Description

Complete the constrained Phase 7 cleanup for the dashboard rewrite. The dashboard service should now build and deploy from `web/dashboard-next`, but the folder must not be renamed and the old `web/dashboard` folder must remain in place because other developers have branches based on this rewrite branch.

## User Story / Requirement

As a maintainer, I want the dashboard cutover automation and documentation to point at the rewritten dashboard while keeping branch coordination stable, so infrastructure actions and deployment can be run without renaming folders or deleting the old reference application yet.

## Context

- Rewrite plan: `instructions/tasks/20260516105903_dashboard_ux_ui_rewrite_plan/README.md`.
- Previous phase record: `instructions/tasks/20260531113442_dashboard_next_phase_6_preferences_notifications_and_email_alignment/README.md`.
- New app: `web/dashboard-next`.
- Legacy app retained temporarily: `web/dashboard`.
- Active deployment service/image name remains `zeta-dashboard` / `zeta/dashboard`.
- Terraform already points the dashboard Cloud Run service at the same image name, so Terraform does not need a folder-level change.

## Constraints

- Do not rename `web/dashboard-next` to `web/dashboard`.
- Do not delete the current branch after merge.
- Delete old dashboard Makefile commands, but keep `web-next:*` commands unchanged.
- Do not perform the infrastructure action or deployment; the maintainer will do those.
- Treat old Phase 7 instructions about removing the legacy dashboard as deferred because they are outdated for the current branch coordination state.

## Acceptance Criteria

- [x] CI builds the rewritten dashboard from `web/dashboard-next`.
- [x] Dev deployment builds the dashboard image from `web/dashboard-next`.
- [x] Prod deployment builds the dashboard image from `web/dashboard-next`.
- [x] `web/dashboard-next` has Docker and nginx packaging for the Cloud Run dashboard service.
- [x] Legacy `web:*` Makefile commands are removed.
- [x] `web-next:*` Makefile commands remain unchanged.
- [x] Root README points local frontend startup at `make web-next:start`.
- [x] Frontend constitution identifies `web/dashboard-next` as the active dashboard standard and keeps `web/dashboard` as a temporary legacy reference.
- [x] Parent rewrite task is marked complete with deferred cleanup noted.
- [x] Terraform is reviewed and left unchanged because the dashboard service and image name stay stable.

## Verification

- [x] `make web-next:build` passes.
- [x] `make web-next:test` passes.
- [x] `make web-next:storybook:build` passes.
- [x] `make api:build` passes.
- [x] `git diff --check` passes.
- [x] `docker build -q web/dashboard-next` passes.
