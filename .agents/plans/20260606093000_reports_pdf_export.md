# Reports PDF Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the disabled "As PDF (soon)" menu item on the reports page with a working client-side PDF download generated with pdfmake.

**Architecture:** The reports page already builds the full nested report client-side (`this.report()`) and exports CSV from it. We add a pure row-flattener (`reportRows`) shared by CSV + PDF, a pure pdfmake document builder (`buildReportDoc`), and thin component glue that lazy-loads pdfmake and triggers the download. No backend or i18n duplication — the data and translations already live in the frontend.

**Tech Stack:** Angular 21 (standalone, signals), Transloco i18n, NgRx Signal Store, pdfmake (lazy-imported), Vitest + jsdom.

---

## Why this approach

- The report data (`groups → leaves → events`) and all localized labels are already client-side. A server-side (Go) PDF would have to re-implement Transloco label logic. Client-side pdfmake reuses both directly.
- pdfmake produces a real text PDF (selectable, small, accessible) with native table layout, page breaks, header/footer — unlike html2canvas/html2pdf which rasterize the DOM.
- pdfmake (~hundreds of KB incl. fonts) is **lazy-imported** so it never enters the main bundle.
- Pure functions (`reportRows`, `buildReportDoc`) are unit-tested in jsdom; the pdfmake runtime glue is kept thin and out of the test path (it cannot run cleanly under jsdom).

## File structure

| File | Responsibility | Change |
| --- | --- | --- |
| `web/dashboard-next/src/app/features/reports/reports.util.ts` | Pure report math + the new `reportRows` flattener (CSV/PDF share it) | Modify |
| `web/dashboard-next/src/app/features/reports/reports.util.spec.ts` | Unit tests for `reportRows` | Modify |
| `web/dashboard-next/src/app/features/reports/reports.pdf.ts` | Pure `buildReportDoc` → pdfmake document definition | Create |
| `web/dashboard-next/src/app/features/reports/reports.pdf.spec.ts` | Unit tests for `buildReportDoc` | Create |
| `web/dashboard-next/src/app/pages/reports/reports-page.component.ts` | `exportPdf()` glue, refactor `exportCsv()` onto `reportRows`, enable PDF menu item | Modify |
| `web/dashboard-next/public/i18n/{de,en,fr}.json` | Add `reports.export.pdfToastTitle` | Modify |
| `web/dashboard-next/package.json` | Add `pdfmake` + `@types/pdfmake` | Modify |

## Notes for the engineer

- **Commands run inside WSL.** The repo is on a WSL path; run make/pnpm via `wsl.exe -d ubuntu -- bash -lc '<cmd>'` from the repo root, or from a WSL shell. The Windows Bash tool cannot `cd` into the UNC path.
- Run frontend commands from `web/dashboard-next` (or use the `make web-next:*` targets from repo root).
- Vitest globals (`describe`/`it`/`expect`) are enabled — existing specs use them without imports.
- Do **not** rename `asset`/`video` API types; UI copy says "video" (product terminology rule).

---

## Task 1: Install pdfmake

**Files:**
- Modify: `web/dashboard-next/package.json`

- [ ] **Step 1: Add the runtime + type dependencies**

Run (in WSL, from `web/dashboard-next`):

```bash
pnpm add pdfmake@^0.2.12
pnpm add -D @types/pdfmake@^0.2.9
```

Expected: `pdfmake` appears under `dependencies` and `@types/pdfmake` under `devDependencies` in `web/dashboard-next/package.json`; `pnpm-lock.yaml` updates.

- [ ] **Step 2: Verify the type entrypoint resolves**

Run (in WSL, from `web/dashboard-next`):

```bash
node -e "require.resolve('pdfmake/build/pdfmake'); console.log('ok')"
```

Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add web/dashboard-next/package.json web/dashboard-next/pnpm-lock.yaml
git commit -m "build(dashboard): add pdfmake for report PDF export"
```

---

## Task 2: Pure row flattener `reportRows`

Extract the CSV row-building into a pure, testable helper that both CSV and PDF reuse. It stays Angular-free (the file header promises this) by taking localized labels + a date formatter as parameters.

**Files:**
- Modify: `web/dashboard-next/src/app/features/reports/reports.util.ts`
- Test: `web/dashboard-next/src/app/features/reports/reports.util.spec.ts`

- [ ] **Step 1: Write the failing test**

Add these imports to the existing import block at the top of `reports.util.spec.ts` (add `reportRows` to the list imported from `./reports.util`):

```ts
import {
  buildReport,
  canStepForward,
  durationHM,
  eventInPeriod,
  isCurrentPeriod,
  reportRows,
  stepCursor,
  videoClock,
} from './reports.util';
```

Then add this `describe` block at the end of the top-level `describe('reports.util', () => { ... })` (just before its closing `});`):

```ts
  describe('reportRows', () => {
    it('flattens groups → leaves → events into [group, leaf, date, type, title, minutes] rows, newest first', () => {
      const events: ReportEvent[] = [
        ev({
          kind: 'video',
          group: { id: 'g1', name: 'Beta' },
          title: 'Clip A',
          at: '2026-06-03T10:00:00Z',
          duration_seconds: 90,
        }),
        ev({
          kind: 'live',
          group: { id: 'g1', name: 'Beta' },
          title: 'Session A',
          at: '2026-06-04T10:00:00Z',
          duration_seconds: 1800,
        }),
      ];
      const report = buildReport('expert', events, 'month', { year: 2026, month: 5 });

      const rows = reportRows(report, {
        videoLabel: 'Video',
        liveLabel: 'Live',
        formatDate: () => '03.06.2026',
      });

      expect(rows).toEqual([
        ['Beta', 'Student One', '03.06.2026', 'Live', 'Session A', '30'],
        ['Beta', 'Student One', '03.06.2026', 'Video', 'Clip A', '2'],
      ]);
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run (in WSL, from `web/dashboard-next`):

```bash
pnpm test -- --run reports.util
```

Expected: FAIL — `reportRows is not a function` / import has no exported member `reportRows`.

- [ ] **Step 3: Write minimal implementation**

Append to `reports.util.ts` (after the duration helpers at the end of the file):

```ts
// ── Table flattening (CSV / PDF export) ──────────────────────────────────────

export type ReportRowOptions = {
  // Localized "video" / "live" labels for the Type column.
  videoLabel: string;
  liveLabel: string;
  // Formats an event's ISO instant into a display date (locale-aware).
  formatDate: (iso: string) => string;
};

// Flattens the nested report into export rows in render order:
// [group, leaf, date, type, title, minutes]. Pure — the caller supplies
// localized labels and the date formatter so this stays Angular-free.
export function reportRows(report: Report, opts: ReportRowOptions): string[][] {
  const rows: string[][] = [];
  for (const group of report.groups) {
    for (const leaf of group.leaves) {
      for (const event of leaf.events) {
        rows.push([
          group.name,
          leaf.name,
          opts.formatDate(event.at),
          event.kind === 'video' ? opts.videoLabel : opts.liveLabel,
          event.title,
          `${Math.round(event.duration_seconds / 60)}`,
        ]);
      }
    }
  }
  return rows;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (in WSL, from `web/dashboard-next`):

```bash
pnpm test -- --run reports.util
```

Expected: PASS — all `reports.util` tests green, including the new `reportRows` test.

- [ ] **Step 5: Commit**

```bash
git add web/dashboard-next/src/app/features/reports/reports.util.ts web/dashboard-next/src/app/features/reports/reports.util.spec.ts
git commit -m "feat(reports): add pure reportRows flattener for exports"
```

---

## Task 3: Pure pdfmake document builder `buildReportDoc`

**Files:**
- Create: `web/dashboard-next/src/app/features/reports/reports.pdf.ts`
- Test: `web/dashboard-next/src/app/features/reports/reports.pdf.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `web/dashboard-next/src/app/features/reports/reports.pdf.spec.ts`:

```ts
import { buildReportDoc } from './reports.pdf';

describe('buildReportDoc', () => {
  const rows = [
    ['Beta', 'Student One', '03.06.2026', 'Video', 'Clip A', '2'],
    ['Beta', 'Student One', '04.06.2026', 'Live', 'Session A', '30'],
  ];
  const meta = {
    title: 'Expertenbericht',
    subtitle: 'Max · Juni 2026',
    columns: ['Gruppe', 'Schüler', 'Datum', 'Typ', 'Beschreibung', 'Länge (Min)'],
  };

  it('puts the title and subtitle into the content and document info', () => {
    const doc = buildReportDoc(rows, meta) as any;
    expect(doc.content[0].text).toBe('Expertenbericht');
    expect(doc.content[1].text).toBe('Max · Juni 2026');
    expect(doc.info.title).toBe('Expertenbericht');
  });

  it('builds a table with a header row plus one row per event', () => {
    const doc = buildReportDoc(rows, meta) as any;
    const table = doc.content[2].table;
    expect(table.headerRows).toBe(1);
    expect(table.widths).toHaveLength(6);
    expect(table.body).toHaveLength(rows.length + 1);
    expect(table.body[0].map((c: any) => c.text)).toEqual(meta.columns);
    expect(table.body[1].map((c: any) => c.text)).toEqual(rows[0]);
  });

  it('renders page numbers in the footer', () => {
    const doc = buildReportDoc(rows, meta) as any;
    expect(doc.footer(2, 5).text).toBe('2 / 5');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (in WSL, from `web/dashboard-next`):

```bash
pnpm test -- --run reports.pdf
```

Expected: FAIL — cannot resolve `./reports.pdf` / `buildReportDoc` is not a function.

- [ ] **Step 3: Write minimal implementation**

Create `web/dashboard-next/src/app/features/reports/reports.pdf.ts`:

```ts
// Pure pdfmake document builder for report exports. Takes the already-flattened
// rows (reportRows) plus localized chrome and returns a plain document object.
// The component lazy-loads pdfmake at runtime and renders this — keeping pdfmake
// out of the main bundle and out of the unit-test path.
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

export type ReportDocMeta = {
  // Localized report title (e.g. "Expertenbericht").
  title: string;
  // One-line summary under the title (e.g. "Max Mustermann · Juni 2026").
  subtitle: string;
  // The 6 localized column headers, in row order:
  // [group, leaf, date, type, title, minutes].
  columns: string[];
};

export function buildReportDoc(rows: string[][], meta: ReportDocMeta): TDocumentDefinitions {
  return {
    pageSize: 'A4',
    pageMargins: [32, 40, 32, 36],
    info: { title: meta.title },
    content: [
      { text: meta.title, style: 'h1' },
      { text: meta.subtitle, style: 'subtitle' },
      {
        table: {
          headerRows: 1,
          widths: ['*', '*', 'auto', 'auto', '*', 'auto'],
          body: [
            meta.columns.map((text) => ({ text, style: 'th' })),
            ...rows.map((row) => row.map((text) => ({ text }))),
          ],
        },
        layout: 'lightHorizontalLines',
      },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      text: `${currentPage} / ${pageCount}`,
      alignment: 'right',
      margin: [0, 8, 32, 0],
      fontSize: 8,
      color: '#888888',
    }),
    defaultStyle: { fontSize: 9 },
    styles: {
      h1: { fontSize: 16, bold: true, margin: [0, 0, 0, 2] },
      subtitle: { fontSize: 10, color: '#666666', margin: [0, 0, 0, 12] },
      th: { bold: true, fillColor: '#f3f4f6', margin: [0, 2, 0, 2] },
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (in WSL, from `web/dashboard-next`):

```bash
pnpm test -- --run reports.pdf
```

Expected: PASS — all three `buildReportDoc` tests green.

- [ ] **Step 5: Commit**

```bash
git add web/dashboard-next/src/app/features/reports/reports.pdf.ts web/dashboard-next/src/app/features/reports/reports.pdf.spec.ts
git commit -m "feat(reports): add pdfmake document builder for report export"
```

---

## Task 4: Add the PDF toast title to i18n

The existing `reports.export.toastTitle` is CSV-specific ("CSV exportiert"). Add a PDF-specific title; reuse `toastMessage`, `fileName`, `columns.*`, `leaf.*`, `unit.video`/`unit.live` as-is.

**Files:**
- Modify: `web/dashboard-next/public/i18n/de.json`
- Modify: `web/dashboard-next/public/i18n/en.json`
- Modify: `web/dashboard-next/public/i18n/fr.json`

- [ ] **Step 1: Add the key to each locale's `reports.export` block**

In `de.json`, change the `export` block so it reads:

```json
    "export": {
      "label": "Exportieren",
      "csv": "Als CSV / Excel",
      "pdf": "Als PDF",
      "soon": "bald",
      "toastTitle": "CSV exportiert",
      "pdfToastTitle": "PDF exportiert",
      "toastMessage": "{{count}} Einträge · {{period}}",
      "fileName": "Zeta-Bericht"
    },
```

In `en.json`:

```json
    "export": {
      "label": "Export",
      "csv": "As CSV / Excel",
      "pdf": "As PDF",
      "soon": "soon",
      "toastTitle": "CSV exported",
      "pdfToastTitle": "PDF exported",
      "toastMessage": "{{count}} entries · {{period}}",
      "fileName": "Zeta-Report"
    },
```

In `fr.json`:

```json
    "export": {
      "label": "Exporter",
      "csv": "En CSV / Excel",
      "pdf": "En PDF",
      "soon": "bientôt",
      "toastTitle": "CSV exporté",
      "pdfToastTitle": "PDF exporté",
      "toastMessage": "{{count}} entrées · {{period}}",
      "fileName": "Zeta-Rapport"
    },
```

- [ ] **Step 2: Verify all three files still parse as JSON**

Run (in WSL, from `web/dashboard-next`):

```bash
node -e "for (const f of ['de','en','fr']) { require('./public/i18n/'+f+'.json').reports.export.pdfToastTitle; } console.log('ok')"
```

Expected: prints `ok` (no JSON parse error, key present in all three).

- [ ] **Step 3: Commit**

```bash
git add web/dashboard-next/public/i18n/de.json web/dashboard-next/public/i18n/en.json web/dashboard-next/public/i18n/fr.json
git commit -m "i18n(reports): add pdf export toast title"
```

---

## Task 5: Wire `exportPdf()` into the component and refactor `exportCsv()`

Refactor `exportCsv()` onto the shared `reportRows`/column helpers (no behavior change), add `exportPdf()`, and enable the PDF menu item.

**Files:**
- Modify: `web/dashboard-next/src/app/pages/reports/reports-page.component.ts`

- [ ] **Step 1: Import the new helpers**

In `reports-page.component.ts`, replace the existing import from `reports.util`:

```ts
import {
  Granularity,
  Totals,
  durationHM,
  quarterOf,
  videoClock,
} from '../../features/reports/reports.util';
```

with:

```ts
import {
  Granularity,
  ReportRowOptions,
  Totals,
  durationHM,
  quarterOf,
  reportRows,
  videoClock,
} from '../../features/reports/reports.util';
import { buildReportDoc } from '../../features/reports/reports.pdf';
```

- [ ] **Step 2: Add shared row/column helpers and refactor `exportCsv()`**

Replace the entire existing `// ── CSV export ──` section (the `exportCsv()` method) at the bottom of the class with:

```ts
  // ── Export helpers (shared by CSV + PDF) ──
  private reportRowOptions(): ReportRowOptions {
    return {
      videoLabel: this.transloco.translate('reports.unit.video'),
      liveLabel: this.transloco.translate('reports.unit.live'),
      formatDate: (iso) =>
        this.dateTime.formatInstantDate(iso, { day: '2-digit', month: '2-digit', year: 'numeric' }),
    };
  }

  private exportColumns(): string[] {
    return [
      this.transloco.translate('reports.columns.group'),
      this.transloco.translate(this.isExpert() ? 'reports.leaf.student' : 'reports.leaf.expert'),
      this.transloco.translate('reports.columns.date'),
      this.transloco.translate('reports.columns.type'),
      this.transloco.translate('reports.columns.description'),
      this.transloco.translate('reports.columns.minutes'),
    ];
  }

  private exportFileName(extension: 'csv' | 'pdf'): string {
    const prefix = this.transloco.translate('reports.export.fileName');
    return `${prefix}_${this.store.viewer()?.name ?? 'report'}_${this.periodLabel()}.${extension}`;
  }

  // ── CSV export ──
  protected exportCsv(): void {
    this.closeMenu();
    const rows = [this.exportColumns(), ...reportRows(this.report(), this.reportRowOptions())];
    const csv =
      '﻿' +
      rows
        .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(';'))
        .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.exportFileName('csv');
    link.click();
    URL.revokeObjectURL(url);

    this.shell.showToast(
      this.transloco.translate('reports.export.toastTitle'),
      this.transloco.translate('reports.export.toastMessage', {
        count: this.report().count,
        period: this.periodLabel(),
      }),
      'success',
    );
  }

  // ── PDF export ──
  protected async exportPdf(): Promise<void> {
    this.closeMenu();
    const rows = reportRows(this.report(), this.reportRowOptions());
    const doc = buildReportDoc(rows, {
      title: this.transloco.translate(this.title()),
      subtitle: `${this.store.viewer()?.name ?? ''} · ${this.periodLabel()}`,
      columns: this.exportColumns(),
    });

    // Lazy-loaded so pdfmake (+ its fonts) never enters the main bundle.
    const pdfMake = (await import('pdfmake/build/pdfmake')).default;
    const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default;
    (pdfMake as unknown as { vfs: unknown }).vfs =
      (pdfFonts as { pdfMake?: { vfs: unknown }; vfs?: unknown }).pdfMake?.vfs ??
      (pdfFonts as { vfs?: unknown }).vfs;

    pdfMake.createPdf(doc).download(this.exportFileName('pdf'));

    this.shell.showToast(
      this.transloco.translate('reports.export.pdfToastTitle'),
      this.transloco.translate('reports.export.toastMessage', {
        count: this.report().count,
        period: this.periodLabel(),
      }),
      'success',
    );
  }
```

- [ ] **Step 3: Enable the PDF menu item in the template**

In the template, replace the disabled PDF menu `<button>` block (the one with `disabled` and the `z-badge` "soon"):

```html
              <button
                type="button"
                role="menuitem"
                disabled
                class="flex w-full cursor-not-allowed items-center justify-between gap-2 px-3 py-2 text-left text-sm opacity-60"
              >
                {{ 'reports.export.pdf' | transloco }}
                <z-badge tone="warning">{{ 'reports.export.soon' | transloco }}</z-badge>
              </button>
```

with:

```html
              <button
                type="button"
                role="menuitem"
                class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--z-surface-warm)]"
                (click)="exportPdf()"
              >
                {{ 'reports.export.pdf' | transloco }}
              </button>
```

(`ZBadgeComponent` stays imported — it is still used by the stat cards and accordion chips.)

- [ ] **Step 4: Type-check and build**

Run (in WSL, from repo root):

```bash
make web-next:build
```

Expected: build succeeds. If pdfmake's default-export or `vfs_fonts` typings reject the casts, adjust the cast (the defensive `?.pdfMake?.vfs ?? .vfs` handles both 0.1.x/0.2.x font-module shapes); do not change the runtime behavior.

- [ ] **Step 5: Lint**

Run (in WSL, from repo root):

```bash
make web-next:lint
```

Expected: no lint errors in the changed files.

- [ ] **Step 6: Run the full frontend test suite**

Run (in WSL, from repo root):

```bash
make web-next:test
```

Expected: PASS — `reports.util`, `reports.pdf`, and existing `reports.store` / `app-shell.store` specs all green.

- [ ] **Step 7: Manual smoke test**

Start the dashboard, open a reports page (`/reports/...`), click **Export → As PDF**.

Expected: a `Zeta-Bericht_<name>_<period>.pdf` downloads; it contains the report title, a `name · period` subtitle, a table with the 6 localized headers and one row per event (group, leaf, date, type, title, minutes), and a `current / total` page footer. A "PDF exportiert" success toast appears.

- [ ] **Step 8: Commit**

```bash
git add web/dashboard-next/src/app/pages/reports/reports-page.component.ts
git commit -m "feat(reports): export report as PDF via pdfmake"
```

---

## Task 6: Completion record

**Files:**
- Create: `.agents/reports/<YYYYMMDDHHMMSS>_reports_pdf_export.md`

- [ ] **Step 1: Write a short completion report**

Create the file with: context (enabled the previously-disabled PDF export), decision (client-side pdfmake, lazy-loaded, sharing `reportRows` with CSV), files touched (list from this plan), verification (`make web-next:build`, `make web-next:test`, `make web-next:lint` + manual download), and follow-ups (e.g. server-side/Gotenberg PDF if scheduled or emailed reports are needed later).

- [ ] **Step 2: Commit**

```bash
git add .agents/reports/
git commit -m "docs(reports): record pdf export implementation"
```

---

## Self-review

- **Spec coverage:** PDF export requested → Tasks 1–5 deliver a working pdfmake download; Task 4 covers i18n; Task 6 records it. ✓
- **Placeholders:** none — every code/test/command step contains concrete content. ✓
- **Type consistency:** `ReportRowOptions` (Task 2) is consumed in Task 5; `reportRows` returns `string[][]` consumed by both `exportCsv` and `buildReportDoc`; `ReportDocMeta` fields (`title`, `subtitle`, `columns`) match the `buildReportDoc` call site; `exportFileName('csv'|'pdf')` matches both call sites. ✓
- **DRY/YAGNI:** CSV + PDF share `reportRows`, `exportColumns`, `exportFileName`; only one new i18n key added; pdfmake is lazy-imported. ✓
