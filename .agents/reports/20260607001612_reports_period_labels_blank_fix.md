# Reports page: blank Month/Quarter/Year (and people) labels

## Context

On dev, the reports page (`/reports`) rendered the period segmented control with no
labels (Month/Quarter/Year), and the people stat card had no label/pill. Reported for
the student report; affects expert report too.

## Root cause

`ReportsPageComponent.translationsReady` derived "translations are loaded" from the
one-shot `translationLoadSuccess` event on `transloco.events$` (a non-replaying
Subject). The active-language JSON is loaded by the shell / earlier pages before this
lazily-loaded route mounts, so the event has already fired by the time the page
subscribes — the signal stays stuck at `initialValue: false` forever.

Every computed gated on `translationsReady()` then returns `''`:
`granOptions` (segment labels), `peopleLabel`, `inGroupsLabel`, `description`,
`emptyDescription`. Labels via the `| transloco` pipe or `translationEvents()` worked,
because `translate()` succeeds synchronously once the JSON is loaded — which it was.
This is why only a subset of labels were blank, matching the screenshot. The "dev only"
nature is a load-timing artifact (warm SPA nav / cached JSON = event missed; a cold
hard-refresh on `/reports` can win the race).

## Fix

Derive `translationsReady` from `transloco.selectTranslation()`, which replays the
cached load **synchronously** when the language is already loaded and re-emits on
language change — instead of waiting for a future event. Removed the now-unused `filter`
rxjs import.

## Files touched

- `web/dashboard-next/src/app/pages/reports/reports-page.component.ts` — readiness signal + import
- `web/dashboard-next/src/app/pages/reports/reports-page.component.spec.ts` — new spec reproducing the bug via `preloadLangs: true`

## Verification

- New spec fails before the fix (`['','','']`), passes after.
- `pnpm exec ng test --watch=false`: 33 files / 102 tests pass.
- `pnpm run lint` clean; `pnpm run build` succeeds.

## Follow-ups (out of scope)

- The `translationsReady`-gated computeds don't read `translationEvents()`, so a live
  language switch won't re-translate them until another signal change. Pre-existing;
  not triggered by the reported bug.
