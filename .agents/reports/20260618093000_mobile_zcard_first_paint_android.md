# Mobile: Android ZCard first-paint bug (comments/cards blank on first open)

## Context
Reported: on Android, opening a video the **first** time showed only the player —
no comments. Reopening fixed it. Investigation showed the symptom was not about
comments at all.

## Root cause
The content cards on detail screens are `ZCard`s. On Android, `ZCard` rendered
via `@expo/ui/jetpack-compose` (`Host` + `Card`). That Compose `Host` **drops its
first paint** when the card mounts in a **non-initial React commit** — exactly
what the `isPending → data` swap on every async detail screen produces. The cards
mounted, measured, and laid out correctly (native view-tree dump showed correct
content-sized bounds) but **never drew** until a remount. A cache-hit reopen
mounts the cards in the initial commit, so they paint — hence "reopen fixes it".

- Confirmed **not** data/auth/layout: logs showed `hasData:true`, `playable:1`,
  reviews `count:2`; the player was correctly 16:9.
- Confirmed **broader than videos**: group detail (same swap, `ZCard`s, no player)
  also showed blank member-section cards on first open.
- Android-only: `z-card.ios.tsx` was already a styled RN `View`, so iOS was unaffected.
- Two in-primitive fixes that did **not** work: forcing a recomposition, and
  remounting the `Host` via a `key` (paint is not gated by the Host's React lifecycle).

## Decision / fix
Render `z-card.android.tsx` as a role-token-styled RN `View` (mirroring
`z-card.ios.tsx`), dropping the Compose `Host`. Keeps Material 3 radii (20dp /
28dp hero) and the tonal `surface`/`accentContainer`/`secondaryContainer` fills
via `useRoleColors()`. Consistent with the repo's established pattern of dropping
`@expo/ui` `Host` where it misbehaves (`f358ae1`, `299d58d`).

## Files touched
- `mobile/src/components/ui/z-card.android.tsx` (only file changed)

## Verification
- Green gate: `make mobile:typecheck` clean; `make mobile:lint` 0 errors;
  `make mobile:test` 781/781 across 108 suites (incl. native-classname-forwarding,
  native-compose-font-guard, primitive-contract, z-card, asset-detail).
- Device (Android emulator, cold first open via `zeta://` deep-link):
  - Asset `Test 3`: metadata + video-parts + Comments cards all paint; the comment
    and its reply render below the player.
  - Group `Testg`: the Students member-section card paints (was a blank gap).

## Follow-ups
- Tier doc nit: AGENTS.md "Build Tiers" lists `ZCard → Card (Android)` (@expo/ui).
  Android now uses a styled RN `View` like iOS — update the note if desired.
- Other `@expo/ui` `Host`-based primitives (e.g. `ZButton`) paint fine in this
  scenario, but worth a glance if any other first-open blank surfaces appear.
