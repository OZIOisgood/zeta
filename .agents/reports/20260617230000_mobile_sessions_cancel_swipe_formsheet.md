# Mobile Sessions: cancel rework — swipe-to-reveal + native formSheet

## Context
User report on the Sessions screen: (1) the cancel confirmation "renders completely
destroyed" (Keep/Cancel buttons out of place) and (2) "deletion should happen via swipe,
not a button." The broken dialog was `ZConfirmDialog`-with-children → `ZDialogPanel`'s
Compose `ModalBottomSheet`, which overlapped content and detached the buttons on device.

## Decision (SOTA)
A confirm that captures input (optional cancellation reason) belongs in a native sheet,
not an Alert (HIG: alerts must not contain text fields). So:
- **Stage 1** — replace the broken dialog with a native **formSheet route** `/cancel/[bookingId]`.
- **Stage 2** — replace the footer ban-icon button with a **swipe-to-reveal** trailing
  "Cancel Session" action on the booking card (iOS Mail / Material pattern). The reveal does
  not auto-fire — the user taps the revealed action — so a destructive action can't be
  triggered by an accidental fling.

## Files touched
Stage 1 (commit `73abef2`):
- `mobile/src/app/cancel/[bookingId].tsx` (new) — formSheet screen; reason → `useCancelBookingMutation` → success toast → `router.back`; inline error on failure; top-aligned compact layout so actions are visible at the opening detent.
- `mobile/src/app/_layout.tsx` — register the formSheet route (presentation:formSheet, detents [0.5,1.0], grabber, corner radius).
- `mobile/src/app/(tabs)/coaching/index.tsx` — `onCancel` → `router.push` the route; removed the inline `CancelDialog` + unused imports/state.
- tests: `mobile/src/__tests__/cancel-session.test.tsx` (new), navigation assertion in `coaching-list.test.tsx`.

Stage 2 (commit `1680323`):
- `mobile/src/components/ui/z-swipeable.{types.ts,tsx,shared.tsx,ios.tsx,android.tsx}` (new) — `ZSwipeable` native-tier primitive: RNGH `ReanimatedSwipeable` on device, RNGH-free bare fallback (exposes the action as an accessible pressable) for web/Storybook/jest.
- `mobile/src/app/_layout.tsx` — `GestureHandlerRootView` at the app root.
- `mobile/src/components/booking-card.tsx` — wrap the card in `ZSwipeable` when cancelable; dropped the ban-icon `ZIconButton`; row spacing moved to the wrapper.
- `mobile/package.json` (jest mappers → bare fallback), `mobile/jest.setup.js` (stub `GestureHandlerRootView`), `mobile/src/components/ui/tiers.ts` (TIERS entry).
- tests: `booking-card.test.tsx` + `coaching-list.test.tsx` target the swipe action testID.

## Verification
- Green gate: `make mobile:typecheck` = 0, `make mobile:lint` = 0 errors, `make mobile:test` = **786 passed / 108 suites**.
- **Android dev build (device screenshots):** formSheet presents over a dimmed list with the reason field + correctly-placed Cancel/Keep buttons (NOT the old destroyed layout); a right-to-left swipe over the `@expo/ui` Compose `ZCard` reveals the danger "Cancel Session" action; tapping it opens the formSheet with the real booking context ("This will cancel the session with Expert Test on Jun 25, 2026, 7:45 AM").
- Root-cause note: the route test first failed on a React-19/RNTL-v14 sync-render race — fixed with `await render(...)` (see [[mobile-device-test-gotchas]]).

## Follow-ups
- **iOS device pass** for the swipe + formSheet (cross-platform primitives — `ReanimatedSwipeable` + native sheet — but unverified on iOS hardware).
- **Optional title:** react-native-screens does not render the native nav header on the Android formSheet, so there is no title bar there; the description line currently serves as context. If a title is wanted on Android, add an in-sheet heading (and set `headerShown:false` to avoid an iOS duplicate).
- The broken `ZDialogPanel` Compose `ModalBottomSheet` is still used by `availability`/`asset` overlays — a separate cleanup, untouched here.
