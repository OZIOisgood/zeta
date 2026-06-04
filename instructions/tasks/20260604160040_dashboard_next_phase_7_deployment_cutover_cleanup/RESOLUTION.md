# Resolution

## Summary

Completed the constrained Phase 7 cleanup for `web/dashboard-next`. The repository now prepares the existing `zeta-dashboard` deployment service to build from the rewritten dashboard while preserving both dashboard folders for branch coordination.

## Technical Details

- Added Docker and nginx packaging to `web/dashboard-next`.
- Updated CI to install and build `web/dashboard-next`.
- Updated dev and prod deployment workflows so the dashboard image is built from `web/dashboard-next`.
- Kept the deployed image and Cloud Run service names unchanged.
- Removed the legacy `web:build` and `web:start` Makefile targets.
- Kept all `web-next:*` Makefile targets unchanged.
- Updated the root README frontend startup command to `make web-next:start`.
- Updated the frontend constitution so new dashboard work targets `web/dashboard-next`.
- Updated the parent rewrite task and Phase 6 resolution to reflect Phase 7 completion and the deferred legacy-dashboard removal.
- Reviewed Terraform and left it unchanged because it already refers to the stable dashboard service and image names, not the source folder.

## Verification

- [x] `make web-next:build`
- [x] `make web-next:test`
- [x] `make web-next:storybook:build`
- [x] `make api:build`
- [x] `git diff --check`
- [x] `docker build -q web/dashboard-next`

Notes:

- Manual infrastructure action and deployment are intentionally left to the maintainer.
- The old `web/dashboard` folder remains for dependent branches and legacy reference.
- The first local `make web-next:build` attempt exposed a corrupted local `node_modules` package tree. `pnpm install --force` repaired the untracked dependency directory, and the build then passed.
