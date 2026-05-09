# Resolution

## Summary
- Added `@ngx-translate/core` and `@ngx-translate/http-loader` to the dashboard.
- Configured Angular providers to load translations from `/i18n/{lang}.json`.
- Added a dashboard i18n service that selects `en` or `de` from the signed-in
  user's language preference, with browser-language detection and English
  fallback.
- Added English and German translation bundles.
- Migrated primary dashboard navigation, preferences, groups, videos, upload,
  sessions, availability, video-call, dialogs, empty states, toasts, and shared
  component copy to translation keys.
- Converted review-status filter values to stable internal keys and localized
  their displayed labels.

## Technical Details
- Shared display components translate their string inputs where appropriate, so
  callers can pass either translation keys or dynamic labels.
- The Preferences page now exposes only languages available to the dashboard
  translation bundles.
- Date/time formatting now uses the active `ngx-translate` language where the
  component formats dates directly.
- No backend permissions, database schema changes, environment variables, or
  deployment configuration changes were required.

## Verification
- [x] Ran `pnpm exec vitest run src/app/pages/videos-page/videos-page.component.spec.ts`.
- [x] Ran `make web:build`.
- [x] Ran `pnpm run build` after final cleanup.
- [ ] UI smoke testing in a browser was not performed in this task.

## Tests
- Updated the review-status filter unit tests to assert stable internal filter
  keys instead of English display labels.

## Next Steps
- Consider adding a small end-to-end smoke test that switches a user's language
  preference and verifies that navigation and page headings update.
