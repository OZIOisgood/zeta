import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { of } from 'rxjs';
import { CoachingApiClient, CoachingBooking } from '../../core/http/coaching-api.service';
import { DashboardDateTimeService } from '../../core/i18n/dashboard-date-time.service';
import { NotificationItem } from '../../core/http/notifications-api.service';
import { notificationLink } from '../../features/notifications/notification-presenter';
import { SessionStore } from '../../features/session/session.store';
import { SessionsPageComponent } from './sessions-page.component';

const HOUR = 60 * 60 * 1000;

function booking(overrides: Partial<CoachingBooking>): CoachingBooking {
  return {
    id: 'b1',
    expert_id: 'expert-1',
    expert_name: 'Coach Ana',
    student_id: 'student-1',
    student_name: 'Lena',
    group_id: 'group-1',
    session_type_id: 'type-1',
    session_type_name: 'Session',
    scheduled_at: new Date(Date.now() + 48 * HOUR).toISOString(),
    duration_minutes: 60,
    status: 'pending',
    created_at: '2026-06-05T10:00:00Z',
    ...overrides,
  };
}

const UPCOMING = booking({
  id: 'b-upcoming',
  session_type_name: 'Strategy Session',
  scheduled_at: new Date(Date.now() + 48 * HOUR).toISOString(),
});
const PAST = booking({
  id: 'b-past',
  session_type_name: 'Retro Session',
  scheduled_at: new Date(Date.now() - 48 * HOUR).toISOString(),
  status: 'done',
});
const CANCELLED = booking({
  id: 'b-cancelled',
  session_type_name: 'Dropped Session',
  scheduled_at: new Date(Date.now() + 72 * HOUR).toISOString(),
  status: 'cancelled',
});

function notification(overrides: Partial<NotificationItem>): NotificationItem {
  return {
    id: 'n1',
    type: 'coaching_booking_created',
    payload: {},
    read: false,
    created_at: '2026-06-05T10:00:00Z',
    ...overrides,
  };
}

/**
 * Routes copied from app.routes.ts. The redirect matters: it is what silently
 * swallowed `/sessions?tab=<x>` and landed booking notifications on "upcoming".
 */
async function renderAt(url: string): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    imports: [
      SessionsPageComponent,
      TranslocoTestingModule.forRoot({
        langs: {
          en: {
            common: {
              actions: { cancel: 'Cancel', join: 'Join', watch: 'Watch' },
              labels: { expert: 'Expert', student: 'Student', reason: 'Reason: {{reason}}' },
              status: { cancelled: 'Cancelled', done: 'Done', upcoming: 'Upcoming' },
            },
            home: { error: { title: 'Error', description: 'Something went wrong' } },
            sessions: {
              title: 'Sessions',
              summary: 'Track upcoming, past, and cancelled coaching sessions.',
              bookLive: 'Book live coaching',
              availability: { title: 'Availability' },
              book: { sessionType: 'Session type' },
              cancel: {
                title: 'Cancel session',
                keep: 'Keep session',
                placeholder: 'Reason',
                descriptionText: 'Cancel with {{otherParty}} on {{scheduledAt}}?',
              },
              columns: {
                session: 'Session',
                participant: 'Participant',
                status: 'Status',
                actions: 'Actions',
              },
              tabs: { upcoming: 'Upcoming', past: 'Past', cancelled: 'Cancelled' },
              empty: {
                upcomingHeading: 'No upcoming sessions',
                upcomingDescription: "You don't have any sessions scheduled yet.",
                pastHeading: 'No past sessions',
                pastDescription: 'Your completed sessions will appear here.',
                cancelledHeading: 'No cancelled sessions',
                cancelledDescription: "You haven't cancelled any sessions.",
              },
            },
          },
        },
        translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        preloadLangs: true,
      }),
    ],
    providers: [
      provideRouter([
        { path: 'sessions', redirectTo: 'sessions/upcoming', pathMatch: 'full' },
        { path: 'sessions/:tab', component: SessionsPageComponent },
      ]),
      {
        provide: CoachingApiClient,
        useValue: { listAllMyBookings: vi.fn(() => of([UPCOMING, PAST, CANCELLED])) },
      },
      {
        provide: SessionStore,
        useValue: { hasPermission: () => false, user: () => ({ id: 'student-1' }) },
      },
      {
        provide: DashboardDateTimeService,
        useValue: { formatSessionDateTime: () => '5 Jun, 10:00' },
      },
    ],
  });

  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  await harness.fixture.whenStable();
  harness.detectChanges();

  return harness;
}

function sessionNames(harness: RouterTestingHarness): string[] {
  return Array.from(harness.fixture.nativeElement.querySelectorAll('article h2')).map((el) =>
    (el as HTMLElement).textContent!.trim(),
  );
}

function activeTabLabel(harness: RouterTestingHarness): string {
  const active = harness.fixture.nativeElement.querySelector('button[data-active]') as HTMLElement;
  return active.textContent!.trim().split(/\s+/)[0];
}

describe('SessionsPageComponent deep-link target', () => {
  it('opens the cancelled tab at the link a cancellation notification produces', async () => {
    const target = notificationLink(
      notification({
        type: 'coaching_booking_cancelled',
        payload: { actor_name: 'Vanessa', scheduled_at: CANCELLED.scheduled_at },
      }),
    );
    expect(target.link).toBe('/sessions/cancelled');

    const harness = await renderAt(target.link);

    expect(activeTabLabel(harness)).toBe('Cancelled');
    expect(sessionNames(harness)).toEqual(['Dropped Session']);
  });

  it('opens the past tab at the link a finished booking notification produces', async () => {
    const target = notificationLink(
      notification({ payload: { student_name: 'Lena', scheduled_at: PAST.scheduled_at } }),
    );
    expect(target.link).toBe('/sessions/past');

    const harness = await renderAt(target.link);

    expect(activeTabLabel(harness)).toBe('Past');
    expect(sessionNames(harness)).toEqual(['Retro Session']);
  });

  it('opens the upcoming tab at the link a future booking notification produces', async () => {
    const target = notificationLink(
      notification({ payload: { student_name: 'Lena', scheduled_at: UPCOMING.scheduled_at } }),
    );
    expect(target.link).toBe('/sessions/upcoming');

    const harness = await renderAt(target.link);

    expect(activeTabLabel(harness)).toBe('Upcoming');
    expect(sessionNames(harness)).toEqual(['Strategy Session']);
  });

  it('ignores a ?tab= query param — the redirect swallows it (why the tab is a path segment)', async () => {
    const harness = await renderAt('/sessions?tab=cancelled');

    expect(activeTabLabel(harness)).toBe('Upcoming');
    expect(sessionNames(harness)).toEqual(['Strategy Session']);
  });
});
