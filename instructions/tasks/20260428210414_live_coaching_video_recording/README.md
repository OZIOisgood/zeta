# Task: Live Coaching Video Recording

## Status
- [x] Defined
- [ ] In Progress
- [x] Completed

## Description
As a coaching participant, I want live coaching calls to be recorded so that the session can be reviewed after the call.

The implementation must start Agora Cloud Recording when the first participant connects to a booked coaching session, store Agora recording identifiers and lifecycle state in a dedicated recording table, and stop active recordings when the call ends or cleanup runs after the session window.

## Permissions

This feature reuses `coaching:video:connect`. No new permission is required because recording lifecycle actions are bound to an existing connectable booking and can only be performed by a booking participant.

## Context
- Current live coaching connect flow:
  - `internal/coaching/connect.go`
  - `web/dashboard/src/app/pages/video-call-page/video-call-page.component.ts`
- Current booking persistence:
  - `db/migrations/20260403000001_create_coaching.up.sql`
  - `db/migrations/20260428211000_add_coaching_recording_state.up.sql`
  - `db/queries/coaching.sql`
- Kotlin reference:
  - `tmp/video-coach/backend/cloud-recording`
  - `tmp/video-coach/backend/live-coaching`
- Current Agora documentation:
  - Cloud Recording REST quickstart
  - Cloud Recording RESTful API reference
  - REST authentication reference
  - Third-party cloud storage regions: Google Cloud Storage uses `vendor=6` and `region=0`.

## Test Decision

Automated backend tests should be updated because this feature changes the connect contract and adds external-service branching. Frontend behavior is narrow and will be covered by the production build unless the implementation adds complex UI state.

## Acceptance Criteria
- [x] Live coaching connect still returns valid Agora join data.
- [x] When recording is enabled and configured, connect starts one cloud recording per booking.
- [x] The recording service uses a unique integer recording UID that is different from participant UIDs.
- [x] The recording request uses the current Agora REST base URL and Basic HTTP authentication.
- [x] Dev/prod infrastructure provisions Google Cloud Storage and HMAC credentials for Agora recording output.
- [x] Client leave and cleanup routes stop active recordings without failing if Agora has already stopped them.
- [x] `make api:build` succeeds.
