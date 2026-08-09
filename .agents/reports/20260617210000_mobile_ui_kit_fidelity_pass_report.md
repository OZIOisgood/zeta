# Mobile UI-Kit — 1:1 Fidelity Pass Report

**Date:** 2026-06-17
**Branch:** `feat/mobile-token-auth`
**Range (fidelity pass):** `0a54dcf..fbbaf8a` (9 commits on top of the adoption)
**Audit:** 17-agent read-only audit of the implemented UI vs the handoff prototype (`design-references/screens*.jsx`) + README, across colors / typography / sizes / structure / completeness.

## Context
After the initial handoff adoption, the user asked to verify the implementation is **1:1 with the handoff** (colors, font, sizes, structure; anything missing) and to fix all gaps, using SOTA judgment for genuine decisions and without asking. This pass audited every primitive and screen against the prototype and fixed the gaps.

## Answering "are colors / font / sizes / structure 1:1?"
- **Colors — yes.** All role-token hexes already matched the handoff table exactly (light+dark). Added the missing **surface-1..4** tier tokens (`#fdf1ea/#faece2/#f5e6db/#efe0d4`; dark equivalents); fixed mis-tier/wrong-token usages: notification unread → warm `surface` tile (read → transparent), first-step circle `accentStrong→accent` + `outlineStrong→outline`, tonal-button icons → `onSecondaryContainer`, upload review tile → `accent-container`/`onAccentContainer`, book session-type selected → `tone="accent"` (dropped legacy `bg-z-primary-soft`).
- **Font — yes.** Nunito Sans is loaded (400/500/600/700/800) and applied as the default. Fixed weights to match: screen/section titles → **800** (group name, member/invite section titles, booking title, stat count, upload SecTitle), interactive labels → **600** (FAB), chip selected **700 @ 13.5px**, stat label **700 @ 12px**.
- **Sizes — yes.** Inputs **56dp / 12dp** (incl. `ZSelect` fallback), `ZIconTile` **40dp (`md`) / 12dp**, FAB **16dp rounded-square** (corrected from a pill), chip label **13.5px**, avatar initials now **proportional** to size, video thumbnail **100×66 / 14dp**, field label **13/700/6**, stat card **16dp**. (`ZProgress` iOS already renders the 4dp native track.)
- **Structure — yes, with 3 documented exceptions (below).** Profile rebuilt to the handoff **grouped list + pushed Preferences** (was tabs + a non-handoff tonal master row); availability sections → single **grouped `ZCard` + `ZDivider`** with a leading calendar tile on schedule rows; upload file picker → **dashed-border target** (icon + label + hint); group/create → single submit + centered avatar; group preferences → **"Gefahrenzone" eyebrow**; hero "Details" + booking "watch recording" → correct `secondary`/`tonal` variants; review replies indented; etc.

## Fixed (9 commits)
1. `feat: add surface-tier tokens surface-1..4` — the missing 4-tier surface system.
2. `fix: primitive value fidelity (fab/progress/avatar/chip/icon-tile/select/field-label)`.
3. `fix: card/row composition fidelity (home/sessions/asset/notifications)`.
4. `fix: reports + groups typography/color fidelity` (QR kept scannable at 160px; the handoff's 76px is a prototype placeholder).
5. `fix: form-screen structure fidelity (upload/invite/create-group/preferences)`.
6. `fix: availability grouped-card structure`.
7. `refactor: rebuild Profile as grouped list + pushed Preferences` (all save/dirty/mutation/permission/state logic relocated intact; full info parity with the web counterpart).
8. `fix: notification read/unread + clock a11y`.
9. `fix: book session-type tonal selection + ZAvatar tone type`.

Each commit passed an independent spec + quality review. Green gate: `make mobile:lint` (0 errors), `mobile:typecheck` (clean), `mobile:test` (**101 suites / 707 tests**).

## Deferred — genuine contract gaps (NOT fabricated, per SOTA)
These handoff elements cannot be made 1:1 without a backend/i18n/product change; fabricating data, flows, or copy would be wrong:
1. **Invite confirm subtitle + description** — the handoff shows "{N} members · invited by {coach}" + a group description, but the `InvitationInfo` API response carries only `code`, `group_id`, `group_name`, `group_avatar`, `already_member`. **Needs new API fields.** (Camera-viewport radius + button gaps were fixed.)
2. **Login "Konto erstellen" button** — the handoff shows a second tonal create-account button, but the app uses a **single WorkOS AuthKit hosted flow** (no separate signup entry) and there is **no i18n key** for "create account". **Needs a product/auth decision + a new i18n key.**
3. **Profile tab title "Profil"** — reused the existing `preferences.title` ("Einstellungen") since there is no profile/account title key. **Needs a new i18n key** if the literal "Profil" is wanted.

## Skipped (deliberate, low/no visual impact)
- Radius CSS-var tokens (`--radius-*`) — values are already correct in components; parameterizing as CSS vars is cosmetic churn with no render change.
- `--shadow-fab` token — the Android M3 FAB uses the correct default resting elevation.
- `ZSwitch` off-track stays `outline` (M3-spec-compliant) rather than the handoff's literal undefined `surface-4`.
- Sub-pixel/whitespace spacing deltas within tolerance (e.g. 14px vs 13.5px body, gap-2 vs gap-3) were not chased where not visually meaningful.
- A `ZCard padding={0}` prop for flush inset-grouped lists — the current default-padded grouped card is a faithful grouped look; a real `padding` prop is a separate primitive enhancement.

## Required before sign-off (human)
- **Device-screenshot fidelity gate (Task 6.2):** jest renders only the bare Material fallback. The iOS HIG variants, Android M3 native paths, dark mode, the new grouped Profile/availability lists, dashed upload picker, tonal selections, and notification read/unread affordance must be smoke-tested on **real iOS + Android dev builds** with both-platform screenshots in the PR.
- Resolve the 3 deferred contract gaps with product/backend/i18n.

## Notes
- Single mobile PR convention: all phased commits on `feat/mobile-token-auth`; not pushed; no merges to `main`.
