import {
  buildReport,
  currentCursor,
  stepCursor,
  canStepForward,
  isCurrentPeriod,
  eventInPeriod,
  quarterOf,
  durationHM,
  videoClock,
  type ReportEvent,
} from './reports';

function ev(partial: Partial<ReportEvent>): ReportEvent {
  return {
    kind: 'video',
    group: { id: 'g1', name: 'Karate Club' },
    student: { id: 's1', name: 'Alice' },
    expert: { id: 'e1', name: 'Bob' },
    title: 'Kata',
    at: '2026-03-10T09:00:00Z',
    duration_seconds: 90,
    ...partial,
  };
}

// ── period math ──
test('quarterOf maps month 0-11 to its quarter 0-3', () => {
  expect(quarterOf(0)).toBe(0);
  expect(quarterOf(3)).toBe(1);
  expect(quarterOf(11)).toBe(3);
});

test('stepCursor steps month/quarter/year and wraps the year boundary', () => {
  expect(stepCursor('month', { year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
  expect(stepCursor('quarter', { year: 2026, month: 1 }, 1)).toEqual({ year: 2026, month: 3 });
  expect(stepCursor('year', { year: 2026, month: 5 }, 1)).toEqual({ year: 2027, month: 5 });
});

test('canStepForward is false at the current period and true in the past', () => {
  const now = new Date('2026-06-13T00:00:00Z');
  expect(canStepForward('month', currentCursor(now), now)).toBe(false);
  expect(canStepForward('month', { year: 2026, month: 4 }, now)).toBe(true);
  expect(isCurrentPeriod('month', currentCursor(now), now)).toBe(true);
});

test('eventInPeriod filters by month/quarter/year', () => {
  expect(eventInPeriod('2026-03-10T00:00:00Z', 'month', { year: 2026, month: 2 })).toBe(true);
  expect(eventInPeriod('2026-03-10T00:00:00Z', 'month', { year: 2026, month: 3 })).toBe(false);
  expect(eventInPeriod('2026-03-10T00:00:00Z', 'quarter', { year: 2026, month: 0 })).toBe(true);
  expect(eventInPeriod('2026-03-10T00:00:00Z', 'year', { year: 2025, month: 0 })).toBe(false);
});

// ── duration helpers ──
test('durationHM splits whole minutes into hours/minutes', () => {
  expect(durationHM(4320)).toEqual({ hours: 1, minutes: 12 });
  expect(durationHM(2880)).toEqual({ hours: 0, minutes: 48 });
});

test('videoClock formats seconds as m:ss', () => {
  expect(videoClock(90)).toBe('1:30');
  expect(videoClock(5)).toBe('0:05');
});

// ── buildReport (nesting + totals) ──
test('buildReport (expert) nests by group then student and tallies totals', () => {
  const events = [
    ev({ kind: 'video', duration_seconds: 90, student: { id: 's1', name: 'Alice' } }),
    ev({ kind: 'live', duration_seconds: 1800, student: { id: 's2', name: 'Cara' } }),
    ev({ at: '2025-01-01T00:00:00Z' }), // out of period — excluded
  ];
  const report = buildReport('expert', events, 'month', { year: 2026, month: 2 });
  expect(report.count).toBe(2);
  expect(report.groupCount).toBe(1);
  expect(report.leafCount).toBe(2);
  expect(report.totals).toEqual({ videoCount: 1, videoSec: 90, liveCount: 1, liveSec: 1800 });
  // leaves are the *students* on an expert report
  expect(report.groups[0].leaves.map((l) => l.id).sort()).toEqual(['s1', 's2']);
});

test('buildReport (student) uses the expert as the leaf', () => {
  const events = [ev({ expert: { id: 'e9', name: 'Coach Z' } })];
  const report = buildReport('student', events, 'month', { year: 2026, month: 2 });
  expect(report.groups[0].leaves[0].id).toBe('e9');
});

// ── useReportEventsQuery (hook) ──
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

import { useReportEventsQuery } from './reports';

let qc: QueryClient;

beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});

afterEach(() => {
  qc.clear();
});

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const RESPONSE = {
  role: 'expert',
  viewer: { id: 'e1', name: 'Bob' },
  events: [
    {
      kind: 'video',
      group: { id: 'g1', name: 'Karate Club' },
      student: { id: 's1', name: 'Alice' },
      expert: { id: 'e1', name: 'Bob' },
      title: 'Kata',
      at: '2026-03-10T09:00:00Z',
      duration_seconds: 90,
    },
  ],
};

test('useReportEventsQuery fetches /reports/events and returns the response', async () => {
  const GET = jest.fn(async () => ({ data: RESPONSE, error: undefined }));
  const { result } = await renderHook(() => useReportEventsQuery({ GET } as never), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(GET).toHaveBeenCalledWith('/reports/events');
  expect(result.current.data).toEqual(RESPONSE);
});

test('useReportEventsQuery surfaces errors', async () => {
  const GET = jest.fn(async () => ({ data: undefined, error: { message: 'boom' } }));
  const { result } = await renderHook(() => useReportEventsQuery({ GET } as never), { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true));
});
