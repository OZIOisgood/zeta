# Resolution

## Summary

Completed Phase 6 for `web/dashboard-next`: migrated the personal preferences and notification-settings flow from the current dashboard, added Transloco-aware Session Store persistence, and aligned transactional email styling with the rewritten dashboard's orange-white visual system.

## Technical Details

- Added authenticated `/preferences/personal-data` and `/preferences/email-preferences` route surfaces.
- Added a mobile-first preferences page that preserves the current dashboard's personal-data and email-preferences tabs.
- Reused the existing `ZAvatarInputComponent` for compressed avatar uploads.
- Added `ZCheckboxComponent` backed by `ng-primitives/checkbox`.
- Added `ZComboboxComponent` backed by the documented button-only `ng-primitives/combobox` composition so timezone selection behaves like a stable select dropdown without an editable input.
- Reused `ZComboboxComponent` for language selection so both personal-preference dropdowns have the same select-like interaction pattern.
- Guarded combobox portal visibility until the Angular Primitives overlay has calculated its coordinates and synchronously bound the trigger width before Floating UI's first pass. This prevents the transient horizontal overflow caused by the portalled dropdown briefly expanding from its pre-`ResizeObserver` width at stale coordinates.
- Extended `SessionStore` with an `updateCurrentUser` mutation path that updates the stored user and reapplies language/timezone localization preferences.
- Kept the shell language state synchronized when the localization service changes after session loading or preference saves.
- Preserved permission-relevant visibility for notification categories.
- Added English, German, and French copy for the rewritten preferences surface.
- Updated email CSS to use warm background, orange CTA, warm borders, restrained radius, and ink/muted-text tokens from the rewrite plan.
- Kept existing table-based email markup and CSS inlining behavior unchanged for email-client compatibility.
- Added Storybook form-control coverage for the new checkbox and combobox wrappers.
- Added a shell-level, bottom-right toast surface with manual dismissal and automatic dismissal after four seconds.
- Routed successful preference saves through the toast surface while keeping failed saves visible inline for corrective action.
- Removed the duplicate language switcher from the navbar user menu. Language selection remains available on the personal preferences page.
- Added a shared `ZTabsComponent` backed by `ng-primitives/tabs`, plus a lazy-content panel wrapper that preserves the tab-to-panel ARIA relationship.
- Normalized page-level content navigation into a flat tabs bar with an active underline on Videos, Sessions, Preferences, Availability, and Group Preferences.
- Kept the segmented-control wrapper available for genuinely compact toggle groups instead of using it as page navigation.
- Rendered tab counts as compact badges on Sessions, Videos, and Availability.
- Added `ZVideoPreviewComponent` backed by `ng-primitives/interactions` hover handling. It preserves the current dashboard's static-thumbnail to `animated.gif` swap without consuming scroll gestures.
- Reused the preview component on Latest Videos and All My Videos.
- Added a shared Angular Primitives-backed group card so My Groups and Manage Availability use the same top-aligned avatar, title, and clamped description treatment.
- Moved the complete group-card surface into that shared component and added explicit ellipsis trimming so both pages render the same top-aligned card even when descriptions are unusually long.
- Reused the shared group card for the Book Live Coaching group-selection step, including its selected state, so Groups, Availability, and Booking render one consistent card.
- Added an Angular Primitives-backed avatar to the navbar user-menu identity block.
- Replaced the navbar user-menu text trigger with a compact 32px rounded-square user avatar while keeping the dropdown identity avatar at 40px.
- Added translated, accessible inline validation feedback for dirty or touched invalid fields across preferences, group settings, group creation, video upload details, and availability dialogs.
- Restored the old dashboard's shared permission service and route-level permission guard in `dashboard-next`, then aligned navigation and primary feature actions with those permission checks.
- Reused the fixed button-only combobox for Upload Video group selection so the Enter Details dropdown uses the same stable portal positioning as Preferences.
- Hid the First Steps sidebar after its checklist is complete so dashboard content uses the full available width.
- Added the missing Group Preferences page header and icon-led section headers, and stopped route-only tab changes from reloading group data.
- Cleared the completed booking mutation whenever the booking page is entered so users can book another session without reloading.
- Migrated the current dashboard's AI review-text enhancement action into asset-details comment editing, using a dedicated store mutation state and the shared shell toast.
- Added the group's rounded-square avatar to asset details and made the full group identity link to its group page.
- Moved the review AI-enhancement action into the same action row as Cancel and Save, and anchored the add-comment composer to the bottom of the viewport.

## Verification

- [x] `make web-next:build`
- [x] `make web-next:test`
- [x] `make web-next:storybook:build`
- [x] `make email:preview`
- [x] `make api:build`
- [x] `make web:build` before Phase 7 removed the legacy dashboard target
- [x] `go test ./... -count=1`
- [x] Dashboard locale JSON validated with `jq empty`.
- [x] `git diff --check`
- [x] Follow-up `pnpm run test:ci`
- [x] Follow-up `pnpm run build`

Notes:

- The dashboard-next build retains its bundle-budget warning and Agora-related CommonJS optimization warnings.
- The legacy dashboard build retained its existing bundle-budget, Agora CommonJS, and stale `baseline-browser-mapping` warnings before Phase 7 removed the legacy dashboard target.
- Storybook build completed with its existing generated bundle-size warnings.
- Verification commands were run with the installed Node 20 runtime explicitly placed first in `PATH` because the default global pnpm shim resolves to an older Node runtime in this environment.

## Tests

- Added route coverage for the rewritten preferences route.
- Added Session Store coverage for updating the authenticated user and applying saved language/timezone preferences.
- Added preferences component coverage for permission-relevant notification controls and Session Store-backed saves.
- Updated the email renderer test to assert the refreshed orange primary CTA token.
- Added shared tabs coverage for the active tab, keyboard-oriented primitive semantics, and lazy panel ARIA relationship.
- Added hover-preview coverage for animated GIF swapping without scroll capture.
- Added Home coverage for recent previews and the completed First Steps full-width layout.
- Added Group Preferences coverage that prevents route-only tab changes from reloading group data.
- Added follow-up coverage for booking-flow reset, AI-enhanced review text, language combobox reuse, and linked asset group identity.
- Added shared group-card coverage for top alignment and long-description trimming.
- Extended follow-up coverage for booking-card selection, fixed comment composition, and edit-action grouping.
- Added shared combobox coverage for the button-only selected-value rendering contract.
- Final dashboard-next result: 23 test files and 52 tests passed.

## Next Steps

- Phase 7 completed the deployment cutover preparation, updated the frontend constitution, removed legacy Makefile commands, kept the `web/dashboard-next` folder name, and deleted the old `web/dashboard` source.
