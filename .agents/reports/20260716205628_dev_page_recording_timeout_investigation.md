# Dev Page Recording Timeout Investigation

## Context

- Asset: `1d2513ef-9d41-4be7-a29e-18b7277fe43d`
- Booking: `63ffa2b0-bafc-4b3c-a203-56046adc1d5a`
- Incident date: 2026-07-16
- Symptom: three imported video parts are blank and approximately 1:51 long despite three differently sized call attempts.

## Findings

1. The three recording rows are distinct. Their backend lifetimes were 232, 443, and 314 seconds. Mux reports durations of 111.300, 111.300, and 111.333 seconds.
2. GCS contains one MP4 and seven 16-second TS slices for each attempt. The first two MP4 files are byte-identical. Mux thumbnails at 60 seconds are pixel-identical for all three parts and contain only a blank canvas.
3. For every attempt, Agora's `AgoraWebView/2.13.14` (Chrome 103) requested `/recording-view`, then requested it again exactly 60 seconds later. This matches Agora's documented `readyTimeout=60` retry and second-timeout stop behavior.
4. The Agora browser downloaded the dashboard shell (`main`, shared chunks, CSS, and `env.js`) but never requested the lazy `chunk-A72EDLF2.js` containing `RecordingViewPageComponent`.
5. The API received zero requests to `/public/coaching/recording-renderer/exchange`. Therefore the renderer never joined Agora and could never call `navigator.notifyReady()`.
6. The dashboard currently uses Angular 21.2.17. Angular 21 supports its 2025-10-20 Baseline browser set, while Agora's embedded recorder is Chrome 103. The full dashboard shell is therefore not a safe runtime dependency for the recorder.
7. Backend `waitForWebRecording` treats Agora global status 4/5 as success. That only means the cloud service components are ready/in progress; it does not prove the page called `notifyReady`. Later, `Stop` treats Agora 404 as success, so the timeout files are imported and exposed as `ready`.
8. The booking has the same WorkOS user as expert and student. This means a self-test publishes only the student UID, so it cannot validate the real two-person layout. It does not explain the blank recordings: the renderer failed before capability exchange or RTC join.

## Root Cause

The Page Recording URL points at the normal Angular 21 SPA. Agora renders it in an embedded Chrome 103 browser. The SPA does not bootstrap far enough to load the recording route, so the page never exchanges its capability, joins the RTC channel, or calls `notifyReady`. With `readyTimeout=60`, Agora reloads once and stops after the second timeout, producing a deterministic blank recording of about 111 seconds.

## Recommended Fix

1. Replace the Angular route used by Agora with a tiny standalone static recorder page, bundled or written for Chrome 103. It should load only `env.js`, the Agora RTC UMD build, the capability exchange, the two participant tiles, and the logo.
2. Keep the capability in the URL fragment, remove it from browser history immediately, join RTC as UID 4, render student full-screen and expert picture-in-picture, then call `navigator.notifyReady()` only after a successful join.
3. Add an explicit renderer-ready acknowledgement to the existing recording row (no new table). Do not transition `starting -> started` or import files unless the renderer has acknowledged readiness.
4. Periodically query active Agora tasks. A 404/exit before Zeta requested stop must become `failed`, not a successful stop. Do not import timeout artifacts.
5. Add a pinned Chrome 103 renderer smoke test and a real dev end-to-end test with separate student and expert accounts. A self-booking remains useful for one-person recording tests but is not the acceptance test.

## Evidence Sources

- Dev PostgreSQL through Cloud SQL proxy on `127.0.0.1:5433`
- Cloud Run request/application logs for `zeta-dashboard-dev` and `zeta-api-dev`
- GCS bucket `zeta-491012-zeta-dev-coaching-recordings`
- Mux playback metadata and thumbnails
- [Agora page load timeout behavior](https://docs-legacy.agora.io/en/cloud-recording/develop/webpage-load-timeout)
- [Agora start API and `readyTimeout`](https://docs-legacy.agora.io/en/cloud-recording/rest-api/start)
- [Agora query status semantics](https://docs-legacy.agora.io/en/cloud-recording/rest-api/query)
- [Angular browser support](https://angular.dev/reference/versions)

## Verification / Limits

- Agora Analytics Lab was opened through the user's Chrome session, but it required a separate SSO login. The REST customer credentials are not interactive SSO credentials, so no password was read or entered.
- No implementation files or dev data were changed during this investigation.
