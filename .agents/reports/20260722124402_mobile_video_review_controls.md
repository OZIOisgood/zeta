# Mobile video review controls

## Context

Tickets #11, #12, and #13 reported a three-row mobile comment composer, a partial-width finalization action, and an unwanted text label on the comment submission button.

## Decision

- Keep timestamp, auto-resizing comment input, and Send action in one responsive grid row at all breakpoints.
- Make both Mark as Reviewed states fill the review card width.
- Make comment submission an icon-only action with a localized accessible Send label in English, German, and French.

## Files touched

- `web/dashboard-next/src/app/pages/video-details/video-details-page.component.ts`
- `web/dashboard-next/src/app/pages/video-details/video-details-page.component.spec.ts`
- `web/dashboard-next/public/i18n/en.json`
- `web/dashboard-next/public/i18n/de.json`
- `web/dashboard-next/public/i18n/fr.json`

## Verification

- Focused video-details tests: 4 passed.
- Full frontend suite: 45 files, 154 tests passed.
- Frontend formatting check: passed.
- Production dashboard build: passed with existing bundle-size and CommonJS warnings.

## Follow-ups

None.
