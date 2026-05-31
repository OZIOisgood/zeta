import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CoachingApiClient, CoachingBooking } from '../../core/http/coaching-api.service';
import { SessionsOverviewStore } from './sessions-overview.store';

const booking = (id: string, status: CoachingBooking['status']): CoachingBooking => ({
  id,
  expert_id: 'expert-1',
  expert_name: 'Ada Coach',
  student_id: 'student-1',
  student_name: 'Student One',
  group_id: 'group-1',
  session_type_id: 'type-1',
  scheduled_at: '2026-05-16T12:00:00Z',
  duration_minutes: 45,
  status,
  created_at: '2026-05-16T10:00:00Z',
});

describe('SessionsOverviewStore', () => {
  it('groups bookings by time and cancellation status', async () => {
    const future = booking('booking-1', 'pending');
    future.scheduled_at = '2099-05-16T12:00:00Z';
    const past = booking('booking-2', 'pending');
    past.scheduled_at = '2020-05-16T12:00:00Z';
    const cancelled = booking('booking-3', 'cancelled');

    TestBed.configureTestingModule({
      providers: [
        {
          provide: CoachingApiClient,
          useValue: {
            listAllMyBookings: () => of([future, past, cancelled]),
          },
        },
      ],
    });

    const store = TestBed.inject(SessionsOverviewStore);

    await store.loadBookings();

    expect(store.status()).toBe('success');
    expect(store.upcomingBookings()).toHaveLength(1);
    expect(store.completedBookings()).toHaveLength(1);
    expect(store.cancelledBookings()).toHaveLength(1);
  });

  it('updates a booking after cancellation', async () => {
    const future = booking('booking-1', 'pending');
    future.scheduled_at = '2099-05-16T12:00:00Z';
    const cancelled = { ...future, status: 'cancelled' as const, cancellation_reason: 'Travel' };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: CoachingApiClient,
          useValue: {
            listAllMyBookings: () => of([future]),
            cancelBooking: () => of(cancelled),
          },
        },
      ],
    });

    const store = TestBed.inject(SessionsOverviewStore);

    await store.loadBookings();
    await store.cancelBooking('group-1', 'booking-1', 'Travel');

    expect(store.upcomingBookings()).toHaveLength(0);
    expect(store.cancelledBookings()[0].cancellation_reason).toBe('Travel');
  });

  it('records cancellation errors without dropping bookings', async () => {
    const future = booking('booking-1', 'pending');
    future.scheduled_at = '2099-05-16T12:00:00Z';

    TestBed.configureTestingModule({
      providers: [
        {
          provide: CoachingApiClient,
          useValue: {
            listAllMyBookings: () => of([future]),
            cancelBooking: () => throwError(() => new Error('Too late')),
          },
        },
      ],
    });

    const store = TestBed.inject(SessionsOverviewStore);

    await store.loadBookings();
    await store.cancelBooking('group-1', 'booking-1');

    expect(store.mutationStatus()).toBe('error');
    expect(store.mutationError()).toBe('Too late');
    expect(store.upcomingBookings()).toHaveLength(1);
  });
});
