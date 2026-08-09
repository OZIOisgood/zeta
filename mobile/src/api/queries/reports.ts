import { useQuery } from '@tanstack/react-query';
import type { components } from '../schema';
import { api } from '../../auth/auth-store';

export type ReportRef = components['schemas']['ReportRef'];
export type ReportEvent = components['schemas']['ReportEvent'];
export type ReportRole = components['schemas']['ReportEventsResponse']['role'];
export type ReportEventsResponse = components['schemas']['ReportEventsResponse'];

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

// ── Period model ──
export function quarterOf(month: number): number {
  return Math.floor(month / 3);
}

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

export function canStepForward(gran: Granularity, c: Cursor, now: Date): boolean {
  return periodStartIndex(gran, c) < periodStartIndex(gran, currentCursor(now));
}

export function stepCursor(gran: Granularity, c: Cursor, dir: -1 | 1): Cursor {
  if (gran === 'year') {
    // Preserve the month when navigating by year (only the year changes).
    return { year: c.year + dir, month: c.month };
  }
  const delta = gran === 'month' ? 1 : 3; // quarter
  const base = gran === 'month' ? c.month : quarterOf(c.month) * 3;
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

// ── Aggregation (buildReport) ──
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

  return { groups, totals, count, groupCount: groups.length, leafCount: leafIds.size, role };
}

// ── Duration helpers ──
export function durationHM(totalSec: number): { hours: number; minutes: number } {
  const totalMin = Math.round(totalSec / 60);
  return { hours: Math.floor(totalMin / 60), minutes: totalMin % 60 };
}

export function videoClock(totalSec: number): string {
  const total = Math.round(totalSec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Query hook ──
type Fetcher = Pick<typeof api, 'GET'>;

export function useReportEventsQuery(client: Fetcher = api) {
  return useQuery({
    queryKey: ['reports', 'events'],
    queryFn: async () => {
      const { data, error } = await (client as typeof api).GET('/reports/events');
      if (error || !data) throw new Error('Failed to load report');
      return data;
    },
  });
}
