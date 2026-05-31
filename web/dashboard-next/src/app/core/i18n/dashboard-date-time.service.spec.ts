import { TestBed } from '@angular/core/testing';
import { DashboardLocalizationService } from './dashboard-localization.service';
import { DashboardDateTimeService } from './dashboard-date-time.service';

describe('DashboardDateTimeService', () => {
  it('formats European English times without AM/PM', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DashboardLocalizationService,
          useValue: {
            dateLocale: () => 'en-GB',
            timeZone: () => 'Europe/Rome',
          },
        },
      ],
    });

    const service = TestBed.inject(DashboardDateTimeService);

    expect(service.formatInstantTime('2026-05-28T12:30:00Z')).toBe('14:30');
    expect(
      service.formatInstantDateTime('2026-05-28T12:30:00Z', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
    ).not.toMatch(/AM|PM/);
  });
});
