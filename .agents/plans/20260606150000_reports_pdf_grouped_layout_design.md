# Reports PDF Export — Grouped Layout Redesign

## Context

The current PDF export ([reports.pdf.ts](../../web/dashboard-next/src/app/features/reports/reports.pdf.ts))
renders a single flat table with columns `Group · Expert · Date · Type · Description · Length`.
Group and Expert repeat on every row, which is redundant — the dashboard already models the
data hierarchically (group → expert/student → events). The redesign mirrors that hierarchy.

CSV export stays flat (a spreadsheet wants one tabular shape); only the **PDF** changes.

## Decision

Adopt a **grouped, sectioned PDF** ("Variant 3"):

1. **Title + subtitle** — unchanged (`Student report` / `Student Test · June 2026`).
2. **KPI line** (plain text, no boxes) directly under the subtitle:
   `<videoCount> Videos · <videoDuration> | <liveCount> Live · <liveDuration> | <peopleCount> <peopleLabel>`
   Mirrors the dashboard stat cards. Plain text, single line.
3. **One block per (group, leaf) pair**, in render order. Each block has:
   - A bold header line: `<Group> › <Leaf>` on the left, a plain-text subtotal on the right
     (e.g. `3 Videos · 18 Min`, or `2 Videos · 1 Live · 34 Min` when mixed). Bottom border.
   - A slim event table with **4 columns**: `Date · Type · Description · Length`.
     Column header **repeated per block**.
   - Events sorted **oldest first** (PDF-specific; the dashboard keeps newest-first).
4. **Single-line grand total** at the bottom: `Total` left, total duration right, top border —
   not spread across the table columns.

No pills/chips anywhere — all subtotals and the KPI line are plain text.

### Visual reference

```
Student report
Student Test · June 2026
8 Videos · 42 Min | 1 Live · 30 Min | 4 Experts
─────────────────────────────────────────────
Team Alpha › Anna Klein              3 Videos · 18 Min
 Date        Type    Description        Length
 03/06/2026  Video   Beinarbeit          4:35
 09/06/2026  Video   Rückhand Übung      6:05
 14/06/2026  Video   Aufschlag-Analyse   7:20
Team Alpha › Max Roth          2 Videos · 1 Live · 34 Min
 ...
─────────────────────────────────────────────
Total                                 1 Std 12 Min
```

## Architecture

The flat `string[][]` contract no longer carries enough structure for the PDF. Split the two
exports:

- **CSV** — keep `reportRows()` in [reports.util.ts](../../web/dashboard-next/src/app/features/reports/reports.util.ts)
  exactly as is (flat rows incl. Group/Expert columns + trailing total row). No change.
- **PDF** — `buildReportDoc()` takes a new **structured model** instead of flat rows:

```ts
type ReportDocModel = {
  title: string;
  subtitle: string;
  kpiLine: string;                 // pre-formatted, localized
  columns: string[];               // 4 headers: [date, type, description, length]
  sections: {
    heading: string;               // "Group › Leaf"
    subtotal: string;              // "3 Videos · 18 Min"
    rows: string[][];              // [[date, type, description, length], ...] oldest-first
  }[];
  total: { label: string; value: string };  // single-line grand total
};
```

The **component** ([reports-page.component.ts](../../web/dashboard-next/src/app/pages/reports/reports-page.component.ts))
builds this model from `report.groups`:
- iterates groups → leaves, emitting one section per leaf;
- formats `heading` as `${group.name} › ${leaf.name}`;
- formats `subtotal` from `leaf.totals` (reuse `fmtDuration`);
- builds `rows` from `leaf.events` **reversed to oldest-first**, with per-event length via the
  existing video=`m:ss` / live=whole-minutes rule;
- builds `kpiLine` from `report.totals` + `report.leafCount` and the localized people label;
- `total.value = fmtDuration(totals.videoSec + totals.liveSec)`.

A small pure helper (e.g. `reportSections()` in `reports.util.ts`, Angular-free, taking localized
labels + formatters like `reportRows` does) produces the `sections` array so the logic stays unit-
testable without Angular.

## Data flow

`ReportsStore.report()` → component assembles `ReportDocModel` (localized) → `buildReportDoc(model)`
returns a pdfmake `TDocumentDefinitions` → component lazy-loads pdfmake and renders. pdfmake VFS
loading and the error toast are unchanged.

## i18n

- Reuse existing `reports.*` keys (`unit.*`, `stats.*`, `leafCount.*`, `columns.*`, `export.total`).
- `columns` for the PDF shrinks to the 4 event columns (drop group/expert headers).
- KPI line and subtotals are composed from existing unit/stat keys; add new keys only if a phrase
  has no existing equivalent (decide during implementation, keep de/en/fr in sync).

## Error handling

Unchanged: pdfmake load/render failures are caught, logged as `reports_pdf_export_failed`, and
surfaced via the error toast.

## Testing

- `reports.util.spec.ts`: keep `reportRows` tests (CSV). Add `reportSections` tests — grouping,
  oldest-first ordering, subtotal/length formatting, mixed video+live.
- `reports.pdf.spec.ts`: update for the new model — assert KPI line, one section per leaf, repeated
  4-column header, single-line total row.
- `make web-next:lint` / `:test` / `:build` all green.

## Out of scope

- CSV layout (stays flat).
- Dashboard event ordering (stays newest-first).
- Page-break tuning beyond pdfmake defaults.
