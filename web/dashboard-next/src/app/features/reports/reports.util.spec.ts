import { ReportEvent } from '../../core/http/reports-api.service';
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

function ev(partial: Partial<ReportEvent>): ReportEvent {
  return {
    kind: 'video',
    group: { id: 'g1', name: 'Beta' },
    student: { id: 's1', name: 'Student One' },
    expert: { id: 'e1', name: 'Coach One' },
    title: 'Clip',
    at: '2026-06-03T18:00:00Z',
    duration_seconds: 120,
    ...partial,
  };
}

describe('reports.util', () => {
  describe('buildReport', () => {
    const events: ReportEvent[] = [
      ev({ kind: 'video', group: { id: 'g2', name: 'Alpha' }, duration_seconds: 60 }),
      ev({ kind: 'live', group: { id: 'g1', name: 'Beta' }, duration_seconds: 1800 }),
      ev({
        kind: 'video',
        group: { id: 'g1', name: 'Beta' },
        expert: { id: 'e2', name: 'Coach Two' },
        duration_seconds: 90,
      }),
    ];
    const cursor = { year: 2026, month: 5 }; // June 2026

    it('nests by group then student for the expert report and sorts groups by name', () => {
      const report = buildReport('expert', events, 'month', cursor);
      expect(report.groups.map((g) => g.name)).toEqual(['Alpha', 'Beta']);
      expect(report.count).toBe(3);
      expect(report.totals).toEqual({
        videoCount: 2,
        videoSec: 150,
        liveCount: 1,
        liveSec: 1800,
      });
      // All three events share student s1, so leaf-by-student collapses to one.
      expect(report.leafCount).toBe(1);
    });

    it('nests by expert for the student report', () => {
      const report = buildReport('student', events, 'month', cursor);
      const beta = report.groups.find((g) => g.id === 'g1')!;
      expect(beta.leaves.map((l) => l.id).sort()).toEqual(['e1', 'e2']);
      expect(report.leafCount).toBe(2);
    });

    it('excludes events outside the active period', () => {
      const report = buildReport('expert', events, 'month', { year: 2026, month: 4 }); // May
      expect(report.count).toBe(0);
      expect(report.groups).toHaveLength(0);
    });
  });

  describe('period math', () => {
    it('matches month, quarter and year windows', () => {
      const at = '2026-06-03T10:00:00Z';
      expect(eventInPeriod(at, 'month', { year: 2026, month: 5 })).toBe(true);
      expect(eventInPeriod(at, 'month', { year: 2026, month: 4 })).toBe(false);
      expect(eventInPeriod(at, 'quarter', { year: 2026, month: 3 })).toBe(true); // Q2
      expect(eventInPeriod(at, 'quarter', { year: 2026, month: 0 })).toBe(false); // Q1
      expect(eventInPeriod(at, 'year', { year: 2026, month: 0 })).toBe(true);
      expect(eventInPeriod(at, 'year', { year: 2025, month: 0 })).toBe(false);
    });

    it('steps months with year rollover', () => {
      expect(stepCursor('month', { year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
      expect(stepCursor('month', { year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    });

    it('steps quarters by snapping to the quarter start', () => {
      expect(stepCursor('quarter', { year: 2026, month: 5 }, -1)).toEqual({ year: 2026, month: 0 });
      expect(stepCursor('quarter', { year: 2026, month: 5 }, 1)).toEqual({ year: 2026, month: 6 });
    });

    it('blocks stepping past the current period', () => {
      const now = new Date('2026-06-15T00:00:00Z');
      expect(isCurrentPeriod('month', { year: 2026, month: 5 }, now)).toBe(true);
      expect(canStepForward('month', { year: 2026, month: 5 }, now)).toBe(false);
      expect(canStepForward('month', { year: 2026, month: 4 }, now)).toBe(true);
    });
  });

  describe('duration helpers', () => {
    it('splits seconds into whole hours and minutes', () => {
      expect(durationHM(4320)).toEqual({ hours: 1, minutes: 12 });
      expect(durationHM(2880)).toEqual({ hours: 0, minutes: 48 });
    });

    it('formats a video clock as m:ss', () => {
      expect(videoClock(288)).toBe('4:48');
      expect(videoClock(65)).toBe('1:05');
    });
  });

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
});
