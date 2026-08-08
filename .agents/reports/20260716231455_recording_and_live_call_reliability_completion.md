# Recording and live-call reliability completion

## Context

Follow-up to the July 16 recording inspection: Page Recording had a white
pre-roll and broken raw-base64 avatars, while the interactive call had stale
device cleanup, a mic-triggered PiP blink, clipped camera-off content, native
device selects, and an unnecessary optional-media banner.

## Implemented

- Agora Page Recording starts with `onhold: true`, waits for renderer readiness,
  and resumes through the web recording `update` endpoint.
- The static renderer normalizes raw base64 avatars and removes failed images so
  initials remain visible.
- Live calls request media best-effort only after RTC join; permission/device
  failures keep the participant connected receive-only. Mic and camera controls
  independently retry missing tracks.
- Leave is idempotent and closes tracks plus clears UI state before awaiting the
  Agora network leave.
- Participant video playback now depends only on the active video track, so audio
  state changes do not stop/play video. The local tile has a compact PiP fallback.
- Device selects use the shared `z-select`, including an accessible dark tone and
  a Storybook example.
- README live-call and recording sequence documentation was updated.

## Verification

- `go test ./internal/coaching`
- `make test:unit` — all packages passed
- `make api:build`
- focused Angular tests — 4 passed
- `pnpm run test:ci` — 153 passed
- `pnpm run lint`
- `pnpm run build` — passed with pre-existing bundle/CommonJS warnings
- `pnpm run build-storybook` — passed with pre-existing asset-size warnings
- `node --check web/dashboard-next/public/recording-view.js`
- `git diff --check`

## Follow-up

Deploy to dev and run a short call/recording smoke test with camera/mic toggles,
leave/rejoin, avatar fallback, device settings, and MP4 frame inspection. This is
required to validate Agora's provider-side hold/resume behavior end to end.
