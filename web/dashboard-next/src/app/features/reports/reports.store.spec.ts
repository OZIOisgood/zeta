import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ReportEventsResponse, ReportsApiClient } from '../../core/http/reports-api.service';
import { ReportsStore } from './reports.store';

const now = new Date();
const iso = (offsetDays: number): string => {
  const d = new Date(now);
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString();
};

const response: ReportEventsResponse = {
  role: 'expert',
  viewer: { id: 'expert-1', name: 'Coach One' },
  events: [
    {
      kind: 'video',
      group: { id: 'g1', name: 'Academy' },
      student: { id: 's1', name: 'Student One' },
      expert: { id: 'expert-1', name: 'Coach One' },
      title: 'Tee shot',
      at: iso(1),
      duration_seconds: 120,
    },
    {
      kind: 'live',
      group: { id: 'g1', name: 'Academy' },
      student: { id: 's1', name: 'Student One' },
      expert: { id: 'expert-1', name: 'Coach One' },
      title: 'Swing analysis',
      at: iso(2),
      duration_seconds: 2700,
    },
  ],
};

describe('ReportsStore', () => {
  it('loads events and exposes a built report for the current month', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: ReportsApiClient, useValue: { events: () => of(response) } }],
    });

    const store = TestBed.inject(ReportsStore);
    await store.load();

    expect(store.status()).toBe('success');
    expect(store.role()).toBe('expert');
    expect(store.viewer()?.name).toBe('Coach One');

    const report = store.report();
    expect(report.role).toBe('expert');
    expect(report.count).toBe(2);
    expect(report.groups).toHaveLength(1);
    expect(report.groups[0].leaves[0].name).toBe('Student One');
    expect(report.totals.videoCount).toBe(1);
    expect(report.totals.liveCount).toBe(1);
  });

  it('disables stepping forward at the current period', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: ReportsApiClient, useValue: { events: () => of(response) } }],
    });

    const store = TestBed.inject(ReportsStore);
    await store.load();

    expect(store.atCurrentPeriod()).toBe(true);
    expect(store.canStepForward()).toBe(false);

    store.stepForward();
    expect(store.atCurrentPeriod()).toBe(true); // no-op at current period

    store.stepBack();
    expect(store.atCurrentPeriod()).toBe(false);
    expect(store.canStepForward()).toBe(true);

    store.resetToday();
    expect(store.atCurrentPeriod()).toBe(true);
  });

  it('records load errors', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ReportsApiClient,
          useValue: { events: () => throwError(() => new Error('boom')) },
        },
      ],
    });

    const store = TestBed.inject(ReportsStore);
    await store.load();

    expect(store.status()).toBe('error');
    expect(store.error()).toBe('boom');
  });
});
