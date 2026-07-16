# Reliable Agora page recording fix

## Context

Dev page recordings produced identical white 111-second videos. Agora's embedded Chrome 103 loaded the Angular route but never loaded its modern lazy chunk, then timed out after 60 seconds. Admin self-bookings also joined as the student because the student ID comparison ran first.

## Decision

- Serve the recording renderer as isolated static HTML/JavaScript with Agora's UMD SDK, independent of Angular.
- Keep UID 4 exclusively for the invisible renderer. If one user is both booking student and expert, treat that human as the expert (UID 2).
- Keep a recording part in `starting` until the renderer joins, calls Agora `notifyReady`, and acknowledges readiness to the API. Fail unready parts without importing their timeout artifacts.
- Allow 1–120 minutes in the database, while API runtime configuration keeps production at 15-minute minimum/5-minute steps and dev at 1-minute minimum/steps.

## Files touched

- Static renderer and dashboard packaging: `web/dashboard-next/public/recording-view.*`, `web/dashboard-next/angular.json`, `web/dashboard-next/nginx.conf`.
- Recording lifecycle and participant role: `internal/coaching/recording*.go`, `internal/coaching/connect.go`, `db/queries/coaching.sql`, generated sqlc/mocks.
- Short-session configuration: `internal/coaching/handler.go`, `internal/coaching/session_types.go`, deployment workflows, `.env.example`, and migration `20260716211500`.
- Tests and architecture documentation: coaching tests and `README.md`.

## Verification

- `go test ./... -count=1`
- `make test:integration` against the local PostgreSQL container after applying the migration
- `make api:build`
- `make web-next:lint`
- `make web-next:test` (149 tests)
- `make web-next:build`; verified the output contains the renderer HTML, JS, and Agora UMD SDK
- `node --check web/dashboard-next/public/recording-view.js`
- `git diff --check`

## Follow-up

- Deploy dev and perform a real admin self-booking smoke test.
- Verify the part reaches `started`, stops after empty grace, imports one non-blank MP4, and appears in Mux.
