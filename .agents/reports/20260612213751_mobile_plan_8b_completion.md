# Completion Report: Mobile Plan 8b — Live Calls (Agora) + Dev-Client/EAS

- **Date:** 2026-06-12
- **Plan:** `.agents/plans/20260612195252_mobile_plan_8b_live_calls.md`
- **PR:** https://github.com/OZIOisgood/zeta/pull/15 (ninth work package; single-PR strategy)

## What landed

- EAS project `@henry2k/zeta` (user decision: personal account): expo-dev-client, `eas.json` (development/preview/production), `com.m4xon.zeta` package ids, camera/mic permissions + iOS usage strings.
- Contract: `connectToBooking` (`{app_id, channel, token, uid}` — token documented as sensitive; 400 too-early/ended/cancelled, 404 non-participant, 503 unconfigured; recording-start failure blocks the token) + `stopBookingRecording` (idempotent 200).
- **Platform-split call engine**: `call-engine.native.ts` (react-native-agora v4: Communication profile, settled-guarded join with 15s timeout, leave→unregister→release) vs. default stub — `expo export --platform web` stays green with agora installed (CI gate held).
- Call store: phases idle/connecting/inCall/error, **generation guard** (leave during connecting can't orphan an engine or resurrect inCall), single-teardown leave with exactly one recording-stop POST (catch-wrapped fire-and-forget), token never in state/errors (tested).
- Call screen `/call/[bookingId]` (fullScreenModal, auth-gated): camera+mic permission gates with localized denied state, connecting/waiting/error phases, RtcSurfaceView remote + local preview, mic/camera/switch/leave controls, unmount-only teardown (covers button/hardware-back/gesture). Join button on booking cards gated by `isJoinable` (mirrors the server window) + `coaching:video:connect`.
- EAS Android dev build triggered: build `53389b69-991e-49b4-bcb8-60a7d917fceb` (https://expo.dev/accounts/henry2k/projects/zeta/builds/53389b69-991e-49b4-bcb8-60a7d917fceb) — queued on the free tier at report time; APK appears under Artifacts when finished.

## Defects caught by the review loops (fixed in-range)

1. `void api.POST(...)` without catch on the fire-and-forget recording stop → unhandled-rejection risk; now catch-wrapped + dep-throw tolerated.
2. Leave during an in-flight join orphaned the freshly-joined engine and could flip state back to inCall → generation counter (red-verified with a gated fake engine).
3. Explicit leave + unmount cleanup double-fired `leave()` (two recording-stop POSTs) — the masking test was made honest first (red), then single-teardown enforced.
4. Permission screen reused the QR-scanner camera copy; missing mic/switch labels → `sessions.call.*` keys added dashboard-side (de du-Form, fr vous-Form) and synced.

## Verification

203 mobile tests (40 suites), tsc, lint, web-next lint, `expo export` (18 routes incl. `/call/[bookingId]`), OpenAPI lint + idempotency, full Go suite — all green. Device E2E (two-party call, controls, recording → asset) requires the dev-build APK and remains on the PR checklist together with the emulator screenshots.

## Follow-ups

- Install the APK when the build finishes (`adb install`), run the two-device call E2E, attach screenshots to PR #15.
- iOS dev build (Apple credentials); push notifications package (now unblocked); deep links.
- Mid-call Agora `onError` currently flips to the error phase for any code — consider filtering warning-class codes after device testing.
- Expert tooling and compliance packages per the spec roadmap.
