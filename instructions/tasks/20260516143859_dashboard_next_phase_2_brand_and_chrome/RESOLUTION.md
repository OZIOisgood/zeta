# Resolution

## Summary

Completed Phase 2 for `web/dashboard-next`: saved generated orange-white brand candidate sheets, expanded reusable UI primitives, and replaced the placeholder app surface with a mobile-first dashboard shell.

## Technical Details

- Saved generated candidate sheets under `web/dashboard-next/src/assets/brand/candidates/` and `web/dashboard-next/src/assets/illustrations/candidates/`.
- Added the `src/assets` Angular asset glob so local Storybook can render candidate assets.
- Added primitives for icon button, badge, segmented control, toast, and empty state alongside the existing button and skeleton.
- Added Storybook stories for all new primitives and a `Brand/Candidates` story for the generated sheets.
- Cropped the selected top-left logo mark into transparent production-candidate assets at 128, 256, and 512px plus a WebP export.
- Added lightweight WebP preview sheets for Storybook while preserving the original generated PNG sheets as source/review assets.
- Excluded the original full-size generated PNG sheets from Angular asset output so local Storybook/build output uses the lightweight previews instead.
- Reworked the app shell with responsive side navigation, mobile drawer, user menu, language switcher, route header, toast surface, skeleton loading placeholder, empty state, and fallback/error state.
- Used Angular `animate.enter` and `animate.leave` with native CSS animation classes in `src/styles.scss`.
- Noted maintainer feedback that the first logo mark in the generated sheet is the preferred direction, while keeping it as a candidate rather than final production branding.
- No backend or email-template changes were required in this phase.

## Verification

- [x] `make web-next:build` passed.
- [x] `make web-next:test` passed.
- [x] `make web-next:storybook:build` passed.
- [x] `make web:build` passed for the legacy dashboard regression check.

## Tests

- Angular/Vitest app tests cover shell rendering and the mobile navigation open interaction.
- NgRx Signal Store tests cover navigation, active section selection, user menu state, toast dismissal, language state, and work queue count.

## Next Steps

- Phase 3 should start moving real product flows into the new app while keeping product copy as "video" and backend/API naming as `asset`.
- Before deploying Storybook, keep the original full-size generated PNG sheets excluded from copied build assets unless they are needed as downloadable source material.
- When branding is final, consider vectorizing the preferred logo mark or creating a hand-polished SVG from the exported production candidate.
