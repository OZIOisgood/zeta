# Completion Report: Mobile Plan 1 — OpenAPI Contract + Token Auth

- **Date:** 2026-06-12
- **Plan:** `.agents/plans/20260611230318_mobile_plan_1_openapi_and_token_auth.md`
- **Spec:** `.agents/plans/20260611225227_mobile_app_react_native_expo_design.md`
- **PR:** https://github.com/OZIOisgood/zeta/pull/15 (`feat/mobile-token-auth`, 13 commits)

## Context

First work package of the mobile app build: token-based auth for native clients plus the OpenAPI contract the mobile TypeScript client will be generated from. Executed via subagent-driven development (fresh implementer per task, two-stage review per task, final whole-branch review).

## What landed

- `establishSession` extracted from `Callback` (shared WorkOS code exchange + org scoping); web cookie flow unchanged.
- `POST /auth/token` — mobile PKCE code exchange, returns JSON `{access_token, refresh_token}`, never sets cookies.
- `POST /auth/token/refresh` — token rotation with success/failure logging (`user_id` parsed from the fresh JWT's `sub` claim).
- Dev endpoint moved `/auth/token` → `/auth/dev/token` (server.go, Bruno collection, `.env.example`).
- Middleware Bearer path pinned by 5 tests (accept, invalid, Bearer-over-cookie, expiry rejection, unknown-key rejection) against a real RSA/JWKS test server.
- OpenAPI 3.1 contract at `docs/openapi.yaml` (auth + health slice), `make api:openapi:lint`, CI job `lint-openapi`.
- README documents the mobile token flow.

## Deviations from the plan

- **Spec path:** `docs/openapi.yaml` instead of `api/openapi.yaml` — the repo root has a gitignored `api` build binary and `.gitignore`'s bare `api` pattern would have ignored the whole directory.
- **Redocly invocation:** `pnpm --package=@redocly/cli@2 dlx redocly lint` — plain `pnpm dlx @redocly/cli@2` fails with `ERR_PNPM_DLX_MULTIPLE_BINS` (package ships two binaries).

## Verification

`go vet` clean, `go test ./... -count=1` green, `go build ./cmd/api` ok, `make api:openapi:lint` 0 errors, `gofmt -l` clean on touched files.

## Review findings consciously NOT applied

- JSON `ErrorResponse` schema in OpenAPI: handlers emit text/plain via `http.Error`; documenting JSON errors would be wrong. Structured JSON errors would be an API-wide design change.
- `cache: pnpm` in the new CI job: `setup-node` fails without a resolvable lockfile path; not worth the risk for ~20s.

## Follow-ups

- Rate limiting for unauthenticated credential endpoints (`/auth/token`, `/auth/token/refresh`, `/auth/dev/token`) — brute-force/replay surface.
- Optional: structured JSON error bodies API-wide, then document them in the OpenAPI spec.
- Optional: `user_id` field parity in the collapsed `auth_session_establish_failed` web-callback log.
- Plan 2 (Expo app skeleton + design system + client auth) includes the manual WorkOS dashboard step: register the mobile redirect URI.
