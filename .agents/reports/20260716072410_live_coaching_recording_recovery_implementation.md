# Live coaching recording recovery implementation

## Context

Tickets #37 and #38 exposed two coupled lifecycle bugs: media permissions were requested as part of joining, and recording started from a credentials request rather than confirmed RTC presence. The old one-row-per-booking recording/import model also could not preserve a later resumed recording.

## Decision

- A credentials request is side-effect free. Confirmed authenticated human presence starts recording, including solo and fully muted participants.
- Human presence uses a server-issued connection UUID plus monotonic event sequence. UID 1/2 are humans; provider/renderer UIDs never count as occupancy.
- Zero fresh humans sets `empty_since`; explicit leave gets a 60-second in-process grace and the every-minute scheduler reconciles crashes/stale tabs.
- One booking owns one recording collection and review asset. Every resume after a stopped attempt creates an ordered video part.
- Agora Web Page Recording renders a fixed 1280x720 student-primary/expert-PiP page. Capability plaintext exists only in the URL fragment and request body; PostgreSQL stores SHA-256 only.
- Live media permissions are optional and requested from a visible user action after RTC join. The same tile states provide avatar, waiting, reconnecting, camera-off, and mic-off presentation.

## Files touched

- Added reversible recording collection/attempt/presence/capability schema and ordered video parts under `db/migrations/`.
- Added sqlc queries for atomic attempt/import claims, stale-worker recovery, legacy rolling-deploy adoption, lifecycle reconciliation, and recording finalization guards.
- Added presence, renderer bootstrap, web recording, multi-attempt import, and asset publication behavior under `internal/coaching/`.
- Updated the Angular Agora service, full-screen call page, public recorder route/page, shared participant tile, API DTOs, translations, and recorder response headers.
- Updated dev/prod Cloud Run recording configuration and the Terraform cleanup scheduler frequency.
- Updated README recording flows and the implementation plan.

## Verification

- Local migration: up, down, up succeeded against the local PostgreSQL container.
- `make db:sqlc`
- generated `MockQuerier`
- `make api:build`
- `make test:unit`
- `make test:integration`
- `pnpm run lint`
- `pnpm run test:ci` (42 files, 150 tests)
- `pnpm run build` (passes with pre-existing bundle/CommonJS warnings)
- `terraform fmt -check infra/terraform/envs/dev/main.tf infra/terraform/envs/prod/main.tf`
- `git diff --check`
- Added provider payload tests for web scene, private renderer URL, 1280x720 output, attempt-specific prefix, and capability hashing.

## Follow-ups

1. Deploy API/dashboard/migration to dev together, then use two human clients to smoke-test: solo muted start, iOS denied permissions, second participant join, both leave for >60 seconds, return and create part 2, Mux import, and ordered review playback.
2. Inspect the first Agora web `Start`, `Query`, and `Stop` payloads plus GCS objects. The implementation raises `maxVideoDuration` above the product's 120-minute session cap and uses 1800 kbps to stay below the common 2 GB split boundary; the schema reserves normalized attempt files, but provider manifest ingestion should be completed before supporting sessions above the current cap.
3. Apply Terraform for the every-minute cleanup scheduler in dev/prod; editing Terraform alone does not change the live scheduler.
4. Promote to prod only after the dev provider smoke-test. No external Agora/Mux recording was started from the local environment because the recorder cannot reach localhost.
