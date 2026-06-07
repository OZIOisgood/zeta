import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ReportsStore } from '../../features/reports/reports.store';
import { Report } from '../../features/reports/reports.util';
import { ReportsPageComponent } from './reports-page.component';

// A student report with no events: enough to render the period bar + stat cards,
// which is where the localized labels under test live.
const REPORT: Report = {
  groups: [],
  totals: { videoCount: 2, videoSec: 0, liveCount: 3, liveSec: 2700 },
  count: 0,
  groupCount: 1,
  leafCount: 1,
  role: 'student',
};

function provideMockStore() {
  return {
    provide: ReportsStore,
    useValue: {
      report: signal(REPORT),
      status: signal('success'),
      gran: signal('month'),
      cursor: signal({ year: 2026, month: 5 }),
      viewer: signal({ id: 'u1', name: 'Test Viewer' }),
      canStepForward: signal(false),
      atCurrentPeriod: signal(true),
      load: vi.fn(),
      setRole: vi.fn(),
      setGran: vi.fn(),
      stepBack: vi.fn(),
      stepForward: vi.fn(),
      resetToday: vi.fn(),
    },
  };
}

describe('ReportsPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ReportsPageComponent,
        // preloadLangs loads the JSON during APP_INITIALIZER — before the component
        // is created — so the one-shot translationLoadSuccess event has already
        // fired by the time the page subscribes. This mirrors a warm navigation on
        // dev, where the active language is loaded before this lazy route mounts.
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              reports: {
                student: { title: 'Student report' },
                description: '{{kind}} for {{name}} · {{count}} activities',
                kind: { month: 'Monthly report' },
                leaf: { expert: 'expert' },
                stats: {
                  videos: 'Videos uploaded',
                  live: 'Live coachings',
                  experts: 'Experts',
                  inGroups: 'in {{count}} groups',
                },
                period: {
                  label: 'Period',
                  month: 'Month',
                  quarter: 'Quarter',
                  year: 'Year',
                  prev: 'Previous period',
                  next: 'Next period',
                  today: 'Today',
                },
                empty: { title: 'No activity', description: 'No activity in {{period}}' },
                unit: { hour: 'h', minute: 'min' },
                export: { label: 'Export' },
              },
            },
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true,
        }),
      ],
      providers: [provideRouter([]), provideMockStore()],
    }).compileComponents();
  });

  it('renders localized period labels when the language is already loaded', async () => {
    const fixture = TestBed.createComponent(ReportsPageComponent);

    await fixture.whenStable();
    fixture.detectChanges();

    const segmented = fixture.nativeElement.querySelector('z-segmented-control');
    const labels = Array.from(segmented.querySelectorAll('button')).map((b) =>
      (b as HTMLElement).textContent?.trim(),
    );

    expect(labels).toEqual(['Month', 'Quarter', 'Year']);
    // Same bug class: the people-count stat label (experts, for a student report) is
    // also gated on translation readiness.
    expect(fixture.nativeElement.textContent).toContain('Experts');
  });
});
