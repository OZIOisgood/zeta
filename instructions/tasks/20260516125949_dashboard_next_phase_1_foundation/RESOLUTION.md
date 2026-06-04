# Resolution

## Summary
Created `web/dashboard-next` as a separate Angular application for the dashboard rewrite Phase 1. The existing `web/dashboard` application remains the current dashboard and behavioural reference.

## Technical Details
- Generated a new Angular 21 application under `web/dashboard-next`.
- Configured Tailwind CSS through Angular's built-in Tailwind setup.
- Added Transloco with an HTTP loader and seed English translations in `public/i18n/en.json`.
- Added NgRx Signal Store and created `AppShellStore` as the first foundation store pattern.
- Added Angular Primitives and used `NgpButton` in the foundation `ZButtonComponent`.
- Added `@lucide/angular` for maintained Lucide icon components.
- Added local Storybook with Zeta UI button and skeleton stories.
- Disabled Storybook Compodoc generation to keep Phase 1 local and lightweight.
- Created a minimal mobile-first orange-white dashboard shell with no Taiga UI usage in the new app.
- Added root Makefile targets for the new app:
  - `make web-next:start`
  - `make web-next:build`
  - `make web-next:test`
  - `make web-next:storybook`
  - `make web-next:storybook:build`
- Documented new app commands and coexistence rules in `web/dashboard-next/README.md`.

## Verification
- [x] Build passed
- [x] Verified in UI/API

Commands run:

- `make web-next:build`
- `make web-next:test`
- `make web-next:storybook:build`
- `make web:build`
- `pnpm start --port 4300 --host 127.0.0.1`

Notes:

- `make web-next:storybook:build` completed successfully with Storybook's standard bundle-size warnings for its generated iframe bundles.
- `make web:build` completed successfully for the existing dashboard. It emitted the existing initial bundle budget warning and the existing CommonJS warning for `agora-rtc-sdk-ng`.
- The new dashboard dev server started successfully at `http://127.0.0.1:4300/`.
- No backend or email code changed.

## Tests
- Added `src/app/app.spec.ts` coverage for the new shell render path.
- Added `src/app/core/state/app-shell.store.spec.ts` coverage for foundation Signal Store state and methods.

## Next Steps
- Phase 2 should generate logo and illustration candidates, then expand the design system and application chrome.
- Future phases should migrate real dashboard flows into `web/dashboard-next` without changing deployment wiring until the final cutover phase.
