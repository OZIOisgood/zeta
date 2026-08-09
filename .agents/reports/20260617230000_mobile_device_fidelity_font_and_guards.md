# Mobile UI-Kit — Device Fidelity Pass: font root-cause + footgun + drift guards

**Date:** 2026-06-17
**Branch:** `feat/mobile-token-auth`
**Device:** Android dev build on `emulator-5554` (user: Benjamin, student role), Metro in WSL
**Executes:** `.agents/reports/20260617220000_device_fidelity_handoff_prompt.md`

## Context
Make the mobile app render 1:1 with the UI-kit handoff, verified on a **real device** screen by screen (prior "green but wrong" passes were structurally blind to native render). Plus: define guards against future UI drift.

## The big find — app-wide font fallback (root-caused + fixed)
Every `<Text>` rendered the Android **system font (Roboto), not Nunito Sans**, on device — on *every* screen — while jest / lint / typecheck stayed green (they render the bare web fallback). The user noticed it on the session card; it was global.

**Cause (React 19 + NativeWind v4 + Fabric):** (1) React 19 no longer honors `Text.defaultProps` on function components; (2) NativeWind v4 compiles the weight utilities (`font-bold`/`font-extrabold`) to `fontWeight` only on native — the hand-written `@layer base { .font-* { font-family } }` override in `global.css` is not compiled into the native style. Net: native `<Text>` gets a weight but no `fontFamily` → Roboto.

**Proof:** cropped the rendered hero title from a device screenshot and stacked it (GDI / PowerShell `System.Drawing`) against the real `NunitoSans_800ExtraBold.ttf` (node_modules) AND the emulator's own `Roboto-Regular.ttf` — pre-fix == Roboto, post-fix == Nunito.

**Fix (`a8b2cc8`):** patch `Text.render` in `mobile/src/app/_layout.tsx` to map each rendered `fontWeight` → its loaded Nunito face (400/500/600/700/800); an explicit `fontFamily` is respected. One change, fixes typography on all screens. Device-verified.

## Second font gap — @expo/ui Compose text (`a06a6ce`, surfaced by user review)
The `Text.render` patch only reaches React Native `<Text>`. **@expo/ui Jetpack-Compose `<Text>`** — every button label, segmented control, text input, picker, checkbox, chip and dialog — does NOT inherit it, so those still rendered in Roboto on device (the RN-text fix was real but not "app-wide" as first claimed). Compose `Text` honors `style.fontFamily`: proven on device by a `monospace` probe (rendered monospace) and a pixel-diff showing the Nunito name shifts glyphs off the Roboto default; the "Leave group" button + segmented labels now match the real Nunito face. Named the loaded face on each Compose `<Text>` (labels 600, body/placeholder 400, dialog title 700, selected chip 700). **iOS** (@expo/ui SwiftUI, SF-Pro default) needs the same treatment + verification — deferred to the iOS pass.

## Third font gap — native nav chrome (`3c68cab`)
Native-navigation chrome also does not inherit the JS font: stack **header titles** (`headerTitleStyle`) and **tab-bar labels** (NativeTabs `labelStyle`) rendered Roboto. Added the loaded face — detail headers `NunitoSans_600SemiBold`; the four native list-screen titles `700`/large-`800`; tab labels `NunitoSans_500Medium`. Device-verified: the large title "All my videos" flips Roboto→Nunito (before/after crop). iOS deferred.

So the brand font is delivered across **three** distinct render paths on Android — RN `<Text>` (Text.render patch), `@expo/ui` Compose text (per-`<Text>` fontFamily), and native nav chrome (header/tab style fontFamily). None of these is visible to jest.

## Footgun fixed (`4a9828a`)
`z-card.android` used `matchContents={{ horizontal: true }}` (width only) → the Compose Host collapses to 0 height in a height-auto/centered parent (the failure that blanked the login). Fixed to both axes, matching `z-fab.android`. Verified: Profile/Preferences grouped cards render at full height on device.

## Drift guards added (the ask)
Both source-level scans — the only kind that can see native-render bugs jest is blind to:
- `mobile/src/__tests__/font-resolution-guard.test.ts` — the `Text.render` patch must stay present (no silent revert to `defaultProps`) and every weight must map to a face actually loaded via `useFonts`.
- `mobile/src/__tests__/native-host-matchcontents-guard.test.ts` — fails on any horizontal-only `matchContents` (proven to flag the pre-fix `z-card`; accepts both-axes / vertical-only / bare).
- `mobile/src/__tests__/native-compose-font-guard.test.ts` — in any Android file importing Compose `Text`, every `<Text>` must set a `fontFamily` (it caught a multi-line chip label that the manual sweep missed).
- The existing eslint `no-restricted-syntax` raw-hex guard was left in place.

## Device walk — 13 screens verified faithful (Nunito everywhere, role tokens, native primitives)
Home, Profile, Videos, Sessions, Groups, AssetDetail (Mux player + native header), GroupDetail, Upload (numbered stepper + dashed target), Book (4-step half-sheet), Reports (segmented + stat cards + activity), Notifications (read/unread + mark-all), Preferences form (role badge, M3 outlined inputs, native toggle list), GroupPreferences (DANGER ZONE).

## Commits
| Commit | What |
|---|---|
| `9217786` | User WIP checkpoint (dark-mode tokens, z-grouped-list, divider consolidation), green-gated first |
| `a8b2cc8` | Font `Text.render` fix — Nunito on native, device-verified |
| `4a9828a` | z-card both-axes footgun + 2 drift guards |
| `1cf3e59` | This report + prior task records |
| `a06a6ce` | Nunito on @expo/ui Compose text (buttons/tabs/inputs/dialog/chip) + compose-font guard — device-verified |
| `6b23704` | Report update — Compose-text section |
| `3c68cab` | Nunito on native nav chrome (header titles + tab labels) — device-verified |

Green gate: lint 0 errors, typecheck clean, **107 suites / 780 tests**.

## Minor / optional (NOT forced — within handoff vocabulary or data-gated)
- Sessions per-card cancel = ghost `ban` icon-button (a11y-labeled, `colors.danger`). Functional; prototype shows no explicit per-card cancel. Optional: labeled/tonal button.
- "Leave group" = `variant="danger"` (solid). Within the handoff button set; the prototype is itself inconsistent (circular danger icon vs. secondary+icon vs. danger list-item across screens*.jsx). Left as-is.
- GroupPreferences shows the "update name/description/image" intro even for a non-owner who has no editable form (only DANGER ZONE renders). Optional: hide the intro when not editable.
- GroupDetail member sections / Reports activity labels look sparse for this test account — permission/data-gated, not bugs (per the prompt's real-data-vs-mock note).

## Not reached — access-constrained for this account/state (documented, not skipped)
- **CreateGroup** — student role shows "Join Group", no create entry.
- **Invite confirm** (`invite.tsx`) — needs an invitation deep-link.
- **Login** — needs sign-out + WorkOS hosted re-login (manual interaction); partially fixed last round.
- **Call** — needs a joinable/live session (next session is in the future).

## Follow-ups
- Dedicated **Login + Call** device pass (with sign-out/re-login and a live session, user present).
- **iOS** pass: apply the same @expo/ui Compose/SwiftUI `fontFamily` fix (iOS defaults to SF Pro), extend the compose-font guard to `.ios`, and capture iOS screenshots for the PR (handoff requires both platforms; this pass was Android).
