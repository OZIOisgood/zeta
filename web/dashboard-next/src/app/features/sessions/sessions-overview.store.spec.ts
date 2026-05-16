import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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
  it('groups bookings by status', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CoachingApiClient,
          useValue: {
            listAllMyBookings: () =>
              of([booking('booking-1', 'pending'), booking('booking-2', 'done')]),
          },
        },
      ],
    });

    const store = TestBed.inject(SessionsOverviewStore);

    await store.loadBookings();

    expect(store.status()).toBe('success');
    expect(store.upcomingBookings()).toHaveLength(1);
    expect(store.completedBookings()).toHaveLength(1);
    expect(store.cancelledBookings()).toHaveLength(0);
  });
});
