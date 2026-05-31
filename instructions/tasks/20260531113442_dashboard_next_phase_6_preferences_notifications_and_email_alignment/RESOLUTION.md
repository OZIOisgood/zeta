# Resolution

## Summary

Completed Phase 6 for `web/dashboard-next`: migrated the personal preferences and notification-settings flow from the current dashboard, added Transloco-aware Session Store persistence, and aligned transactional email styling with the rewritten dashboard's orange-white visual system.

## Technical Details

- Added authenticated `/preferences/personal-data` and `/preferences/email-preferences` route surfaces.
- Added a mobile-first preferences page that preserves the current dashboard's personal-data and email-preferences tabs.
- Reused the existing `ZAvatarInputComponent` for compressed avatar uploads and `ZSelectComponent` for language selection.
- Added `ZCheckboxComponent` backed by `ng-primitives/checkbox`.
- Added `ZComboboxComponent` backed by `ng-primitives/combobox` so timezone selection remains searchable like the current dashboard.
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

## Verification

- [x] `make web-next:build`
- [x] `make web-next:test`
- [x] `make web-next:storybook:build`
- [x] `make email:preview`
- [x] `make api:build`
- [x] `make web:build`
- [x] `go test ./... -count=1`
- [x] Dashboard locale JSON validated with `jq empty`.
- [x] `git diff --check`
- [x] Follow-up `pnpm run test:ci`
- [x] Follow-up `pnpm run build`

Notes:

- The dashboard-next build retains its bundle-budget warning and Agora-related CommonJS optimization warnings.
- The legacy dashboard build retains its existing bundle-budget, Agora CommonJS, and stale `baseline-browser-mapping` warnings.
- Storybook build completed with its existing generated bundle-size warnings.
- Verification commands were run with the installed Node 20 runtime explicitly placed first in `PATH` because the default global pnpm shim resolves to an older Node runtime in this environment.

## Tests

- Added route coverage for the rewritten preferences route.
- Added Session Store coverage for updating the authenticated user and applying saved language/timezone preferences.
- Added preferences component coverage for permission-relevant notification controls and Session Store-backed saves.
- Updated the email renderer test to assert the refreshed orange primary CTA token.
- Added shared tabs coverage for the active tab, keyboard-oriented primitive semantics, and lazy panel ARIA relationship.
- Final dashboard-next result: 18 test files and 39 tests passed.

## Next Steps

- Phase 7 should complete deployment cutover, remove legacy dashboard dependencies after verification, and update the frontend constitution once the replacement application is accepted.
