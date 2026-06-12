# Mobile Plan 8b: Live Calls (Agora) + Dev-Client/EAS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Within the connect window, a booking participant taps Join on the booking card and lands in a full-screen 1-on-1 Agora video call (remote video full, local preview, mute/camera/leave controls); leaving stops the active recording. The app moves from Expo Go to a custom development build (expo-dev-client) built on EAS.

**Key constraints:**
- `react-native-agora` is a NATIVE module with no web support. Our CI gate `expo export --platform web` must keep passing → the engine is wrapped in a platform-split seam (`call-engine.native.ts` with the real SDK, `call-engine.ts` as a throwing stub that Metro uses for web; jest mocks the seam). NO direct `react-native-agora` import outside the `.native` file.
- EAS account is logged in (WSL, `npx eas-cli@latest`); project owner is **henry2k** (user decision). Free tier — don't trigger redundant builds.
- Design rules (`mobile/AGENTS.md`) binding. Single-PR strategy (PR #15) — everything on `feat/mobile-token-auth`.

**Backend source of truth:** `internal/coaching/connect.go` — `GET /groups/{groupID}/coaching/bookings/{bookingID}/connect` → `{app_id, channel, token, uid (uint32)}`, perm `coaching:video:connect` (verify slug in permissions.go), participant + connect-window checks inside (READ for exact error codes); `POST …/bookings/{bookingID}/recording/stop` (read response/codes; tolerate failures client-side — fire-and-forget on leave). Connect window: default 15 min before start (env `CONNECT_WINDOW`), call ends at `scheduled_at + duration_minutes`.

**Conventions:** identical to Plans 2–8a (wsl.exe wrapper, UNC paths, RNTL 14, tests never under `src/app/`, per-task gates, Conventional Commits, no `Co-Authored-By`).

---

## File Structure (end state)

```
mobile/app.json                       + android.package/ios.bundleIdentifier, owner henry2k,
                                        camera/mic permissions for calls, expo-dev-client
mobile/eas.json                       NEW — cli + build profiles (development/preview/production)
docs/openapi.yaml + schema.d.ts       + connectToBooking + stopBookingRecording operations
mobile/src/call/call-engine.ts        seam INTERFACE + web/dev stub (throws "native build required")
mobile/src/call/call-engine.native.ts real react-native-agora implementation
mobile/src/call/call-store.ts         zustand store: idle/connecting/inCall/error, toggles, join/leave (+tests)
mobile/src/lib/connect-window.ts      pure isJoinable(booking, now) (+tests)
mobile/src/app/call/[bookingId].tsx   full-screen call UI (gated route)
mobile/src/components/booking-card.tsx + Join affordance within the window
mobile/src/__tests__/call-screen.test.tsx
```

---

### Task 1: Dev-client + EAS project setup (NO build yet)

- [ ] `cd mobile && pnpm exec expo install expo-dev-client`.
- [ ] `mobile/app.json`: add `"owner": "henry2k"`; `expo.android.package: "com.m4xon.zeta"` and `expo.ios.bundleIdentifier: "com.m4xon.zeta"`; android permissions for calls (`CAMERA`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `INTERNET`, `BLUETOOTH_CONNECT` — merge with whatever expo-camera's plugin already injects; check the existing plugins array) and iOS `infoPlist` `NSMicrophoneUsageDescription` (camera description exists via the expo-camera plugin — verify, add if missing).
- [ ] `eas init`: run `npx eas-cli@latest init --non-interactive` (it should pick up owner+slug; if it refuses non-interactively, try `eas init --id`-less interactive via a here-doc answer or `eas project:init`; ADAPT and report exactly what worked). Result: `extra.eas.projectId` in app.json under owner henry2k.
- [ ] `mobile/eas.json` (check `npx eas-cli@latest --version` and use the current schema):

```json
{
  "cli": { "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview": { "distribution": "internal", "android": { "buildType": "apk" } },
    "production": { "autoIncrement": true }
  },
  "submit": { "production": {} }
}
```

- [ ] Gates (mobile test/tsc/lint + expo export web) stay green → commit `chore(mobile): add expo-dev-client and EAS project configuration`.

### Task 2: Contract — connect + recording stop

- [ ] READ `connect.go` + the recording-stop handler fully (participant check, window violations, recording-disabled case — exact codes/messages). Add operations `connectToBooking` (GET, response `{app_id, channel, token, uid}` — uid is uint32 → `type: integer, format: int64` won't fit semantics; use `integer` with `minimum: 0` and document; verify how openapi-typescript types it) and `stopBookingRecording` (POST; response per handler). Schemas `BookingConnectInfo` (+ a stop-response schema if non-empty). SECURITY: the Agora token is a credential — mark the description accordingly; it must never be logged client-side.
- [ ] Lint → regenerate → suite green → commit `feat(api): add call connect and recording stop to the contract`.

### Task 3: Call engine seam + store (TDD)

- [ ] `pnpm add react-native-agora` (latest v4.x). Add the package to jest `transformIgnorePatterns` if needed; jest must NEVER load the real native module — tests exercise the seam.
- [ ] `src/call/call-engine.ts` (DEFAULT, used by web/jest): exports the interface + a stub:

```ts
export type CallEngineEvents = {
  onRemoteUserJoined: (uid: number) => void;
  onRemoteUserLeft: (uid: number) => void;
  onError: (message: string) => void;
};

export type CallEngine = {
  join: (appId: string, channel: string, token: string, uid: number) => Promise<void>;
  leave: () => Promise<void>;
  setMicMuted: (muted: boolean) => void;
  setCameraEnabled: (enabled: boolean) => void;
  switchCamera: () => void;
};

export function createCallEngine(_events: CallEngineEvents): CallEngine {
  throw new Error('Live calls require the native development build.');
}
```

- [ ] `src/call/call-engine.native.ts`: same exports implemented with `react-native-agora` v4 (`createAgoraRtcEngine`, `initialize({appId, channelProfile: Communication})`, register event handler (onUserJoined/onUserOffline/onError), `enableVideo`, `startPreview`, `joinChannel(token, channel, uid, {clientRoleType: Broadcaster})`, leave → `leaveChannel` + `release`; mute via `muteLocalAudioStream`, camera via `muteLocalVideoStream`/`enableLocalVideo`, `switchCamera`). Follow the installed SDK's v4 API — verify names against its TypeScript types; adapt minimally. NEVER log the token.
- [ ] `src/lib/connect-window.ts`: `isJoinable(booking: {status, scheduled_at, duration_minutes}, now: Date, windowMinutes = 15): boolean` — pending status AND `now >= scheduled_at - window` AND `now <= scheduled_at + duration`. Pure + tested (before window, in window, during, after end, cancelled).
- [ ] `src/call/call-store.ts` (factory + singleton + `useCall` hook, like upload-store): state `{phase: 'idle'|'connecting'|'inCall'|'error', remoteUid: number|null, micMuted, cameraEnabled, error?: string}`; deps `{engine: typeof createCallEngine, fetchConnect: (groupId, bookingId) => Promise<ConnectInfo>, stopRecording: (groupId, bookingId) => Promise<void>}` (defaults: seam + api calls); actions: `join(groupId, bookingId)` (connecting → fetch connect → engine.join → inCall; failure → error phase, engine cleaned), `leave()` (engine.leave + fire-and-forget stopRecording + reset), `toggleMic`, `toggleCamera`, `switchCamera`. TDD with a fake engine (~7 tests: happy join wires events, remote join/leave updates uid, connect-fetch failure → error, engine-join failure → error + no stuck connecting, leave stops recording + resets, toggles flip engine calls, onError → error phase).
- [ ] Gates green (incl. `expo export --platform web` — proves the stub split works) → commit `feat(mobile): add call engine seam and call store`.

### Task 4: Call UI + Join affordance

- [ ] `src/app/call/[bookingId].tsx` (route in the signedIn guard; params include groupId via search param — pass `/call/{bookingId}?groupId={gid}` from the card): on mount request camera+mic permissions (`expo-camera` `useCameraPermissions` + `useMicrophonePermissions`; denied → explanatory state + settings hint + back), then `call.join(...)`. Phases: connecting → ZSkeleton/dimmed state (no text-only loading); inCall → full-screen remote video (`RtcSurfaceView` from react-native-agora with `uid: remoteUid` — IMPORT ONLY inside a `.native` component file: create `src/call/call-view.native.tsx` + `call-view.tsx` stub rendering a notice, exporting `<CallVideo remoteUid localPreview/>`), local preview top-right (small rounded), waiting-for-partner state when `remoteUid === null` (muted hint + avatar circle); controls bottom row (ZIconButton: mic toggle, camera toggle, switch camera, red leave) — leave → `call.leave()` → `router.back()`. error phase → message + retry/back. Hardware back (Android) triggers leave (expo-router `beforeRemove` or `BackHandler` — implement cleanly and note the approach).
- [ ] `booking-card.tsx`: new optional `onJoin` prop + Join ZButton (primary, testID `booking-join`) shown when `onJoin` provided; coaching tab passes `onJoin` only when `isJoinable(booking, now)` AND `coaching:video:connect` permission present → `router.push('/call/' + id + '?groupId=' + group_id)`.
- [ ] Tests (`call-screen.test.tsx` mocks: the call store (phase-varying), expo-camera permissions, expo-router; plus booking-card/coaching-list additions): connecting renders skeleton state; inCall with remoteUid renders controls + CallVideo stub; waiting state when no remote; leave calls store.leave + router.back; permissions denied state; Join button appears only within window+permission (extend coaching-list tests with a joinable booking).
- [ ] Gates + export web green → commit `feat(mobile): add live call screen with join window gating`.

### Task 5: Dev build + docs + final verification

- [ ] Trigger the Android dev build: `npx eas-cli@latest build --profile development --platform android --non-interactive --no-wait` (from `mobile/`). Capture the build URL/ID. Poll `npx eas-cli@latest build:list --limit 1 --json --non-interactive` until `status: finished` (or errored — then READ the build logs via the URL, fix, retry ONCE; if it fails twice, report BLOCKED with the log excerpt). Free tier: do not trigger parallel builds.
- [ ] While the build runs: docs. `mobile/README.md`: replace the "Expo Go works" claims — new "Development builds" section: prerequisites (EAS login), `eas build --profile development --platform android`, install via `adb install <apk>`, then `pnpm run start` connects the dev client (`--dev-client` is default with expo-dev-client installed); Expo Go no longer supports the call features. Root README: extend the mobile auth/architecture notes with the Agora edge: `Mobile -->|Video Call| Agora` in the mermaid diagram (matches the existing Web edge).
- [ ] i18n pass for call/Join copy (existing `sessions.call.*`/`common.*` keys first — the web call page is localized; add dashboard-side keys only where missing, tone-matched, sync).
- [ ] Full battery: mobile gates + api lint + web-next lint (if dashboard JSONs touched) + Go suite + `expo export --platform web`.
- [ ] Commit `feat(mobile): finish live call package with dev build docs` → push → PR #15 body Part 8b + APK link for the user + install/run instructions; screenshots checklist (call screen needs a REAL device/emulator with the dev build — note as pending manual).

---

## Out of Scope (follow-ups)

- iOS dev build (needs Apple credentials) — Android first.
- Call quality settings, screen sharing, speaker toggle; reconnect/network-drop UX beyond Agora defaults.
- Push notifications package (now unblocked by the dev build); deep links.

## Verification Checklist (end of plan)

- [ ] ≥185 mobile tests green; `expo export --platform web` passes WITH react-native-agora installed (stub split proven)
- [ ] EAS dev build finished; APK link reported to the user
- [ ] No Agora token in any log; call screen gated (auth + permission + window)
- [ ] Go suite + contract idempotency green
