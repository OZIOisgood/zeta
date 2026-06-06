// Ported from the design prototype (reports-data.jsx + reports-views.jsx). Pure,
// Angular-free: period math, event aggregation (buildReport) and the numeric
// duration helpers. The component localizes labels/dates on top of these.

import { ReportEvent, ReportRole, ReportRef } from '../../core/http/reports-api.service';

export type Granularity = 'month' | 'quarter' | 'year';

// A position in time. `month` is 0-11. The active period is derived from the
// granularity: month → that month, quarter → that quarter, year → that year.
export type Cursor = { year: number; month: number };

export type Totals = {
  videoCount: number;
  videoSec: number;
  liveCount: number;
  liveSec: number;
};

export type ReportLeaf = { id: string; name: string; totals: Totals; events: ReportEvent[] };
export type ReportGroup = { id: string; name: string; totals: Totals; leaves: ReportLeaf[] };

export type Report = {
  groups: ReportGroup[];
  totals: Totals;
  count: number;
  groupCount: number;
  leafCount: number;
  role: ReportRole;
};

function emptyTotals(): Totals {
  return { videoCount: 0, videoSec: 0, liveCount: 0, liveSec: 0 };
}

function addEvent(t: Totals, e: ReportEvent): void {
  if (e.kind === 'video') {
    t.videoCount++;
    t.videoSec += e.duration_seconds;
  } else {
    t.liveCount++;
    t.liveSec += e.duration_seconds;
  }
}

// ── Period model ─────────────────────────────────────────────────────────────

export function quarterOf(month: number): number {
  return Math.floor(month / 3);
}

// A comparable integer for the START of the cursor's active period, so we can
// tell whether one period precedes another regardless of granularity.
function periodStartIndex(gran: Granularity, c: Cursor): number {
  if (gran === 'month') return c.year * 12 + c.month;
  if (gran === 'quarter') return c.year * 12 + quarterOf(c.month) * 3;
  return c.year * 12;
}

export function currentCursor(now: Date): Cursor {
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function isCurrentPeriod(gran: Granularity, c: Cursor, now: Date): boolean {
  return periodStartIndex(gran, c) === periodStartIndex(gran, currentCursor(now));
}

// Whether stepping forward is allowed (never past the current period).
export function canStepForward(gran: Granularity, c: Cursor, now: Date): boolean {
  return periodStartIndex(gran, c) < periodStartIndex(gran, currentCursor(now));
}

// Step the cursor backward/forward by one period of the active granularity.
export function stepCursor(gran: Granularity, c: Cursor, dir: -1 | 1): Cursor {
  const delta = gran === 'month' ? 1 : gran === 'quarter' ? 3 : 12;
  const base = gran === 'month' ? c.month : gran === 'quarter' ? quarterOf(c.month) * 3 : 0;
  const total = c.year * 12 + base + dir * delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

export function eventInPeriod(atISO: string, gran: Granularity, c: Cursor): boolean {
  const d = new Date(atISO);
  if (d.getFullYear() !== c.year) return false;
  if (gran === 'month') return d.getMonth() === c.month;
  if (gran === 'quarter') return quarterOf(d.getMonth()) === quarterOf(c.month);
  return true;
}

// ── Aggregation (buildReport) ────────────────────────────────────────────────

// Nest the period's events by group, then by leaf — the student (expert report)
// or the expert (student report). Events are already scoped to the viewer by the
// API, so we only filter by period here.
export function buildReport(
  role: ReportRole,
  events: ReportEvent[],
  gran: Granularity,
  c: Cursor,
): Report {
  const leafOf = (e: ReportEvent): ReportRef => (role === 'expert' ? e.student : e.expert);

  const totals = emptyTotals();
  const groupMap = new Map<string, ReportGroup>();

  for (const e of events) {
    if (!eventInPeriod(e.at, gran, c)) continue;
    addEvent(totals, e);

    let g = groupMap.get(e.group.id);
    if (!g) {
      g = { id: e.group.id, name: e.group.name, totals: emptyTotals(), leaves: [] };
      groupMap.set(e.group.id, g);
    }
    addEvent(g.totals, e);

    const leafRef = leafOf(e);
    let leaf = g.leaves.find((l) => l.id === leafRef.id);
    if (!leaf) {
      leaf = { id: leafRef.id, name: leafRef.name, totals: emptyTotals(), events: [] };
      g.leaves.push(leaf);
    }
    addEvent(leaf.totals, e);
    leaf.events.push(e);
  }

  const groups = [...groupMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const leafIds = new Set<string>();
  for (const g of groups) {
    g.leaves.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    for (const leaf of g.leaves) {
      leafIds.add(leaf.id);
      leaf.events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    }
  }

  let count = 0;
  for (const g of groups) for (const l of g.leaves) count += l.events.length;

  return {
    groups,
    totals,
    count,
    groupCount: groups.length,
    leafCount: leafIds.size,
    role,
  };
}

// ── Duration helpers ─────────────────────────────────────────────────────────

// Whole-minute split for stat cards & chips: "1 Std 12 Min" / "48 Min".
export function durationHM(totalSec: number): { hours: number; minutes: number } {
  const totalMin = Math.round(totalSec / 60);
  return { hours: Math.floor(totalMin / 60), minutes: totalMin % 60 };
}

// Compact event duration: videos as "m:ss", live as whole minutes.
export function videoClock(totalSec: number): string {
  const total = Math.round(totalSec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Table flattening (CSV / PDF export) ──────────────────────────────────────

export type ReportRowOptions = {
  // Localized "video" / "live" labels for the Type column.
  videoLabel: string;
  liveLabel: string;
  // Formats an event's ISO instant into a display date (locale-aware).
  formatDate: (iso: string) => string;
};

// Flattens the nested report into export rows in render order:
// [group, leaf, date, type, title, length]. Pure — the caller supplies
// localized labels and the date formatter so this stays Angular-free.
//
// Length mirrors the on-screen per-event duration: videos as "m:ss" (so
// sub-minute clips don't collapse to 0) and live coachings as whole minutes.
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
          eventLength(event),
        ]);
      }
    }
  }
  return rows;
}

// Per-event length cell: videos as "m:ss" (so sub-minute clips don't show 0),
// live coachings as whole minutes. Shared by both export shapes.
function eventLength(event: ReportEvent): string {
  return event.kind === 'video'
    ? videoClock(event.duration_seconds)
    : `${Math.round(event.duration_seconds / 60)}`;
}

// ── Grouped sections (PDF export) ─────────────────────────────────────────────

export type ReportSectionOptions = {
  // Localized "video" / "live" labels for the Type column.
  videoLabel: string;
  liveLabel: string;
  // Formats an event's ISO instant into a display date (locale-aware).
  formatDate: (iso: string) => string;
  // Builds the right-aligned per-section subtotal from a leaf's totals
  // (e.g. "3 Videos · 18 Min"). Supplied by the caller so this stays Angular-free.
  formatSubtotal: (totals: Totals) => string;
};

export type ReportSection = {
  // "Group › Leaf" header for the block.
  heading: string;
  // Localized subtotal shown to the right of the heading.
  subtotal: string;
  // Event rows in [date, type, description, length] order, oldest first.
  rows: string[][];
};

// Builds one section per (group, leaf) pair for the grouped PDF layout. Unlike
// reportRows (flat, newest-first for the dashboard), events here are ordered
// oldest-first so the block reads as a chronological history. Pure — labels and
// formatters are supplied by the caller.
export function reportSections(report: Report, opts: ReportSectionOptions): ReportSection[] {
  const sections: ReportSection[] = [];
  for (const group of report.groups) {
    for (const leaf of group.leaves) {
      // leaf.events is stored newest-first; reverse for oldest-first display.
      const ordered = [...leaf.events].reverse();
      sections.push({
        heading: `${group.name} › ${leaf.name}`,
        subtotal: opts.formatSubtotal(leaf.totals),
        rows: ordered.map((event) => [
          opts.formatDate(event.at),
          event.kind === 'video' ? opts.videoLabel : opts.liveLabel,
          event.title,
          eventLength(event),
        ]),
      });
    }
  }
  return sections;
}
