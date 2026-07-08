# Live Call Layout And Recording Grace

## Context

Follow-up QA found that the live call view could exceed small viewport height, the device selector panel was still appearing in an odd location, muted mic/camera controls were too visually close to the leave-call danger button, and recording stopped too eagerly when a participant left.

## Scope

- Reworked the call page into a viewport-bounded `h-dvh` layout with the local preview overlaid on small screens and docked on desktop.
- Replaced the call device panel's `z-select` controls with native styled selects inside a fixed bottom panel anchored above the call bar.
- Restyled muted audio/video controls as dark red inactive states, leaving the bright red treatment only for Leave Call.
- Changed recording stop behavior: participant leave before scheduled end defers stopping, participant leave at/after scheduled end stops immediately, and internal cleanup stops lingering recordings after a two-minute post-end grace period.

## Files Touched

- `web/dashboard-next/src/app/pages/video-call/video-call-page.component.ts`
- `internal/coaching/recording.go`
- `internal/coaching/recording_test.go`
- `db/queries/coaching.sql`
- regenerated sqlc/db mock outputs under `internal/db/`

## Verification

- `go test ./internal/coaching -count=1`
- `make api:build`
- `CI=true PATH="/Users/test/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/test/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH" make web-next:lint`
- `CI=true PATH="/Users/test/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/test/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH" make web-next:build`

Angular build completed with the existing bundle budget and CommonJS warnings.
