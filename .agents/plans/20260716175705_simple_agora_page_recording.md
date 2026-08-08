# Simple Agora page recording

## Context

Dev testers need working session recording now, including a new video part after everyone leaves and later rejoins. The full six-table implementation is preserved on `codex/agora-page-recording-full-snapshot` at `961fb39`.

## Decision

- Use managed Agora Page Recording for now.
- Evolve the two existing recording tables instead of running legacy and v2 pipelines.
- Treat the booking as the collection: it owns one review asset and allocates ordered part numbers.
- Keep one narrow presence table with only participant role and server-written `last_seen_at`.
- Store renderer capability fields on each recording row.
- Keep imports retryable and able to represent each MP4 returned by Agora/GCS.
- Keep a provider column so a later `zeta` recorder manager/worker can replace Agora without another data-model redesign.

## Flow

1. A participant joins Agora and heartbeats every 10 seconds.
2. The first fresh heartbeat atomically creates one active recording part.
3. While either participant remains fresh, that part continues—even with camera and microphone off.
4. When nobody is fresh, the recorder waits the empty-channel grace period, then stops.
5. Stop output is imported into Mux and appended to the booking's one asset in deterministic order.
6. A later rejoin creates part 2, 3, and so on in the same asset.

## Scope

- Rewrite the unshipped `20260715230000` migration to the minimal model.
- Remove collection/attempt/file/capability tables and all legacy adoption paths.
- Simplify backend presence and recording lifecycle to one runtime.
- Retain the protected recording page and participant/recording layouts.
- Regenerate sqlc, update architecture/config documentation, and verify backend/frontend/migration paths.

## Follow-up

Build the self-hosted recorder later as separate manager and recorder-worker binaries using the same provider-neutral recording rows.
