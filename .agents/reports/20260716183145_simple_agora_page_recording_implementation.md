# Simple Agora page recording implementation

## Context

The original recovery implementation introduced six new recording tables and a dual legacy/v2 runtime. Dev testers need a smaller managed solution now; the full version remains preserved on `codex/agora-page-recording-full-snapshot` at `961fb39`.

## Decision

- Agora Page Recording is the only active provider today.
- Runtime storage is three tables total: evolved `coaching_booking_recordings`, evolved `coaching_recording_imports`, and narrow `coaching_booking_presence`.
- `coaching_bookings` owns the shared review asset and next part number.
- A future self-hosted recorder can write the same provider-neutral recording rows with `provider='zeta'`.

## Implemented

- Removed collection, attempt, attempt-import, file, renderer-capability, and wide participant-state tables and all adoption/dual-pipeline queries.
- Added authenticated 10-second liveness heartbeats, 60-second empty grace, durable scheduled reconciliation, and new ordered parts after a stopped session resumes.
- Kept recording active for a solo participant and when both users publish no media.
- Kept capability hash/expiry on the recording row; it is replayable only while that recording is active and is cleared on stop/failure.
- Added Agora renderer `notifyReady`, `readyTimeout`, audio profile, MP4 output, and Query backoff until provider status 4/5.
- Discover and import every provider MP4 (including approximately 2 GB splits) into one booking asset in deterministic order.
- Kept student-primary/expert-PiP recording UI, avatar/camera-off placeholders, and microphone-off badge.
- Preserved join-before-device-permission behavior for ticket #37.

## Verification

- Fresh temporary PostgreSQL database: all migrations up, final migration down, final migration up.
- Local database reconciled from the empty full schema to the simple schema; migration version clean and removed-table count is zero.
- `go test ./...`
- `make api:build`
- Frontend formatting/lint passed.
- Angular tests: 42 files, 150 tests passed.
- Angular production build passed (existing bundle/CommonJS warnings remain).
- Terraform formatting passed; dev/prod workflow YAML parsed successfully.
- `git diff --check` passed.

## Follow-up

- Deploy dev and run the real two-part smoke test with Agora/GCS/Mux credentials. No live cloud deployment or provider-dashboard mutation was performed in this task.
- Later add the separate Zeta recorder manager and recorder-worker binaries against the existing provider-neutral rows.
