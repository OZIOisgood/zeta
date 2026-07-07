# Dependabot Queue Resolution

## Context

Resolved the open Dependabot backlog from July 2026. Several PRs were green and mergeable; others conflicted after the first grouped npm security update landed.

## Decision

- Merged green Dependabot PRs directly where GitHub allowed it: grouped npm security update, pnpm action, Node Docker images, selected Go modules.
- Rolled remaining conflicting package updates into `main` manually using package managers: `github.com/fatih/color`, landing `cheerio` and `markdown-it`, dashboard `@ngrx/signals`, `@angular/cli`, `vitest`, `jsdom`, and `postcss`.
- Left GitHub Actions major updates for `actions/setup-go` and `google-github-actions/auth` unmerged because the available `gh` token lacks `workflow` scope.

## Files Touched

- `go.mod`, `go.sum`
- `web/dashboard-next/package.json`, `web/dashboard-next/pnpm-lock.yaml`
- `web/landing/package.json`, `web/landing/package-lock.json`
- Dependabot PR state via `gh`

## Verification

- `make api:build`
- `go test ./... -count=1`
- `npm test` in `web/landing`
- `npm run build` in `web/landing`
- `pnpm run lint` in `web/dashboard-next`
- `pnpm run test:ci` in `web/dashboard-next`
- `pnpm install --frozen-lockfile && pnpm run build` in `web/dashboard-next`

Dashboard build passed with existing bundle/CommonJS warnings.

## Follow-ups

- Merge or recreate workflow PRs with a GitHub token/session that has `workflow` scope.
