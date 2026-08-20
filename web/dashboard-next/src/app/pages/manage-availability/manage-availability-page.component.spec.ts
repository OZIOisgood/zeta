import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { Subject } from 'rxjs';
import { EnvService } from '../../core/http/env.service';
import { DashboardDateTimeService } from '../../core/i18n/dashboard-date-time.service';
import { DashboardLocalizationService } from '../../core/i18n/dashboard-localization.service';
import { AvailabilityStore } from '../../features/sessions/availability.store';
import { ManageAvailabilityPageComponent } from './manage-availability-page.component';

describe('ManageAvailabilityPageComponent', () => {
  const paramMap = new Subject<ReturnType<typeof convertToParamMap>>();
  const loadGroups = vi.fn(async () => undefined);
  let minSessionDurationMinutes = 15;
  let sessionDurationStepMinutes = 5;

  beforeEach(async () => {
    vi.clearAllMocks();
    minSessionDurationMinutes = 15;
    sessionDurationStepMinutes = 5;

    await TestBed.configureTestingModule({
      imports: [
        ManageAvailabilityPageComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: {
            availableLangs: ['en'],
            defaultLang: 'en',
          },
          preloadLangs: true,
        }),
      ],
      providers: [
        { provide: ActivatedRoute, useValue: { paramMap } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: AvailabilityStore, useValue: { loadGroups } },
        {
          provide: EnvService,
          useValue: {
            get minSessionDurationMinutes() {
              return minSessionDurationMinutes;
            },
            get sessionDurationStepMinutes() {
              return sessionDurationStepMinutes;
            },
          },
        },
        {
          provide: DashboardDateTimeService,
          useValue: { formatDate: vi.fn(), formatInstantDateTime: vi.fn() },
        },
        {
          provide: DashboardLocalizationService,
          useValue: { timeZone: () => 'UTC', dateLocale: () => 'en-GB' },
        },
      ],
    }).compileComponents();
  });

  it('does not reload availability when only the active tab changes', async () => {
    const fixture = TestBed.createComponent(ManageAvailabilityPageComponent);

    paramMap.next(convertToParamMap({ groupId: 'group-1', tab: 'session-types' }));
    await Promise.resolve();
    paramMap.next(convertToParamMap({ groupId: 'group-1', tab: 'schedule' }));
    await Promise.resolve();

    expect(loadGroups).toHaveBeenCalledTimes(1);
    expect(loadGroups).toHaveBeenCalledWith('group-1');
    expect(fixture.componentInstance['activeTab']()).toBe('schedule');

    paramMap.next(convertToParamMap({ groupId: 'group-2', tab: 'blocked' }));
    await Promise.resolve();

    expect(loadGroups).toHaveBeenCalledTimes(2);
    expect(loadGroups).toHaveBeenLastCalledWith('group-2');
    expect(fixture.componentInstance['activeTab']()).toBe('blocked');
  });

  it('enforces the production duration range and increment before creating a payload', () => {
    const fixture = TestBed.createComponent(ManageAvailabilityPageComponent);
    const component = fixture.componentInstance;

    component['sessionTypeName'].setValue('Video review');

    for (const invalidDuration of ['5', '16', '125']) {
      component['sessionTypeDuration'].setValue(invalidDuration);
      expect(component['sessionTypeDuration'].invalid).toBe(true);
      expect(component['sessionTypePayload']()).toBeNull();
    }

    for (const validDuration of ['15', '20', '120']) {
      component['sessionTypeDuration'].setValue(validDuration);
      expect(component['sessionTypeDuration'].valid).toBe(true);
      expect(component['sessionTypePayload']()?.duration_minutes).toBe(Number(validDuration));
    }
  });

  it('uses the development duration contract from runtime configuration', () => {
    minSessionDurationMinutes = 1;
    sessionDurationStepMinutes = 1;
    const fixture = TestBed.createComponent(ManageAvailabilityPageComponent);
    const component = fixture.componentInstance;

    component['sessionTypeName'].setValue('Quick check');
    component['sessionTypeDuration'].setValue('5');

    expect(component['sessionTypeDuration'].valid).toBe(true);
    expect(component['sessionTypePayload']()?.duration_minutes).toBe(5);
  });
});
