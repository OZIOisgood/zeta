# Session recording and live-call UI investigation

## Context

Inspected the two Agora Page Recording MP4 files in
`tmp/session-recording-test-2` and traced the reported live-call UI defects.
No product code was changed in this investigation.

## Recording evidence

| File | Duration | Initial white frame | Camera visible | Empty tail |
| --- | ---: | ---: | ---: | ---: |
| `mezzanine (1).mp4` | 98.01 s | ~0.43 s | ~2.43-35.00 s | ~63 s |
| `mezzanine.mp4` | 193.05 s | ~0.37 s | ~1.5-129.93 s | ~63 s |

- Both files decode successfully and contain distinct recordings.
- The camera and audio end at the user's leave time. The remaining minute is the
  configured empty-channel grace period.
- The white opening is encoded into both videos. Page Recording starts capturing
  before the renderer has painted its first usable frame.
- Toggling only the microphone produces a black PiP interruption in both files:
  about 11.33-11.53 s in the short file and 20.13-20.33 s in the long file.
- The self-booking/admin test correctly rendered the admin as the expert PiP and
  left the student as the main placeholder. A real student would occupy the main tile.

## Root causes

1. **Broken recording avatar:** `participantPresentation` returns the stored raw
   base64 avatar. `z-avatar` converts raw base64 to a `data:image/jpeg;base64,...`
   URL, but `public/recording-view.js` assigns the raw value directly to `img.src`.
2. **White recording start:** the recorder begins producing frames while its browser
   is still loading/painting the renderer. The backend does not currently start web
   recording on hold and resume it after renderer readiness.
3. **PiP blink on microphone toggle:** `ParticipantTileComponent`'s video effect
   reads the complete participant state object. An audio-only state change runs the
   cleanup (`videoTrack.stop()`) and immediately plays the same video track again.
4. **Camera-off PiP clipping:** the normal large-tile placeholder (80-96 px avatar,
   name and status) is rendered inside a 128x72/192x108 PiP with `overflow-hidden`.
5. **Device dropdown:** the live-call page uses native `select` elements instead of
   the existing `z-select` wrapper.
6. **Leave cleanup:** tracks are closed before awaiting Agora leave, but UI signals
   are cleared only after that await. `leave()` can also be called concurrently by
   the button and `ngOnDestroy`.
7. **Optional-device banner:** it preserves receive-only joining after permission
   denial, but creates unnecessary product UI. Media can be requested after RTC join
   without making media permission a prerequisite for staying in the call.

## Recommended fix order

1. Normalize recording avatar sources and remove failed images on `error`.
2. Make tile video playback depend only on the active video track, not audio state.
3. Add a compact PiP placeholder variant.
4. Make Agora leave idempotent and clear UI/media state immediately while closing
   tracks before the network leave completes.
5. Replace native device selects with `z-select`, adding a dark-surface style.
6. Remove the optional-device banner. Attempt media best-effort after RTC join; a
   denied/missing device must leave the user connected receive-only, and controls
   should support retrying individual devices.
7. Start Page Recording with `onhold: true` and resume through Agora's `update`
   endpoint only after the renderer is ready. Keep a small import-time trim only as
   a fallback if Agora still emits a pre-roll frame.

## Verification for the implementation

- Component test: an audio-only change never calls video `stop()` or a second `play()`.
- Component/Storybook check at 128x72 and 192x108 for camera-off PiP.
- Service test: track signals are cleared and tracks closed before a delayed client
  `leave()` resolves; repeated leave calls share one cleanup.
- Renderer test for raw base64, existing data URLs, missing avatar, and image errors.
- End-to-end dev call with two real roles: media allowed, denied, muted, camera off,
  leave/rejoin, and a second recording attempt.
- Downloaded MP4 starts on the finished layout (no white pre-roll), has no mic-toggle
  video blink, and preserves the intended ~60-second empty-channel tail.
