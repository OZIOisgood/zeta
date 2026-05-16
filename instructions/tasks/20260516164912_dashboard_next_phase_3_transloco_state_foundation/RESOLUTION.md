# Resolution

## Summary

Completed Phase 3 for `web/dashboard-next`: migrated the dashboard locale corpus to Transloco, added multilingual shell language support, and established API-client plus NgRx Signal Store foundations for future feature-page migration.

## Technical Details

- Merged the old dashboard English, German, and French translation JSON into `web/dashboard-next/public/i18n/`.
- Preserved Phase 2 shell and brand/chrome translation keys across all supported locales.
- Updated Transloco configuration to support `en`, `de`, and `fr`.
- Added `DashboardLocalizationService` to resolve browser language, set the active Transloco language, and update `document.documentElement.lang`.
- Updated `AppShellStore` so the language switcher supports English, German, and French.
- Added `EnvService` and the credentials interceptor under `core/http`.
- Added new HTTP clients for auth, assets, groups, and coaching while preserving backend/API `asset` terminology in code. The folder is named `core/http` because the repository `.gitignore` ignores literal `api` directories.
- Added a reusable async-state utility for `idle`, `loading`, `success`, and `error` store states.
- Added representative Signal Stores for session/auth, videos, groups, and sessions overview.
- No backend or email-template changes were required in this phase.

## Verification

- [x] `make web-next:build` passed.
- [x] `make web-next:test` passed.
- [x] `make web-next:storybook:build` passed.
- [x] `make web:build` passed for the legacy dashboard regression check.

Legacy dashboard build warnings remain unchanged: the initial bundle exceeds the configured budget, `agora-rtc-sdk-ng` is CommonJS, and `baseline-browser-mapping` reports stale data.

## Tests

- Added localization tests for language selection, fallback, and document language updates.
- Added Signal Store tests for session/auth success and failure, videos success and failure, groups loading, and sessions overview grouping.
- Existing app shell and app component tests were updated for the expanded language set.

## Next Steps

- Phase 4 can start rebuilding the core video and group flows on top of the new API clients and store pattern.
- Later feature stores should follow the same async-state shape and keep product-facing copy in Transloco while preserving backend `asset` naming in API/data code.
- If a later page requires inefficient frontend joins or unclear permission display, document the backend/API gap in that phase task before adding workaround-heavy UI code.
