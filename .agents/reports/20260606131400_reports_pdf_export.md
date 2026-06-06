# Reports PDF Export

## Context

The reports page (`web/dashboard-next`, expert & student activity reports) already had a
client-side CSV export and a disabled "As PDF (soon)" menu item. This task enabled the PDF
export. The report data and all i18n already live in the frontend, so a client-side approach
avoids duplicating Transloco label logic in the Go backend.

Plan: `.agents/plans/20260606093000_reports_pdf_export.md`.

## Decision

- **Client-side, pdfmake, lazy-loaded.** pdfmake is imported via `await import(...)` inside
  `exportPdf()` so it never enters the main bundle.
- **DRY.** Extracted a pure `reportRows()` flattener in `reports.util.ts`, now shared by both
  CSV and PDF. CSV behavior is byte-for-byte unchanged (verified in review).
- **Pure, testable core.** `buildReportDoc()` (new `reports.pdf.ts`) returns a plain pdfmake
  document definition with a type-only `pdfmake/interfaces` import, so it unit-tests under
  jsdom without loading pdfmake's runtime.
- Added error handling: a failed lazy-load/render shows an error toast instead of failing
  silently (PDF export is async, unlike CSV).

## Files touched

- `web/dashboard-next/package.json` — added `pdfmake` + `@types/pdfmake`.
- `web/dashboard-next/src/app/features/reports/reports.util.ts` — `reportRows` + `ReportRowOptions`.
- `web/dashboard-next/src/app/features/reports/reports.util.spec.ts` — `reportRows` test.
- `web/dashboard-next/src/app/features/reports/reports.pdf.ts` — `buildReportDoc` (new).
- `web/dashboard-next/src/app/features/reports/reports.pdf.spec.ts` — builder tests (new).
- `web/dashboard-next/src/app/pages/reports/reports-page.component.ts` — `exportPdf()`, CSV
  refactor onto shared helpers, enabled PDF menu item.
- `web/dashboard-next/public/i18n/{de,en,fr}.json` — `reports.export.pdfToastTitle`,
  `errorTitle`, `errorMessage`.

## Verification

- `make web-next:build` — passes (only pre-existing CommonJS-interop warnings).
- `make web-next:lint` (prettier `--check`) — clean.
- `pnpm run test:ci` — 32 files / 99 tests passing (incl. `reports.util` + `reports.pdf`).
- Two independent review passes (spec compliance + code quality) per code task — all APPROVED.
- **Pending:** manual in-browser download smoke test (no browser available in this session) —
  verify the PDF downloads with title, `name · period` subtitle, the 6-column table, and the
  page-number footer.

## Follow-ups

- Manual browser smoke test of the actual download (above).
- `reports.export.soon` i18n key is now unused (was only on the disabled PDF button) — can be
  removed in a cleanup.
- If reports ever need to be generated outside an active browser session (scheduled exports,
  Resend email attachments) or pixel-perfect branded output, revisit a server-side
  headless-Chromium / Gotenberg approach — out of scope here.
