import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  CoachingApiClient,
  CoachingBooking,
  CoachingSlot,
} from '../../core/http/coaching-api.service';
import { GroupsApiClient } from '../../core/http/groups-api.service';
import { BookingFlowStore, localDateKey } from './booking-flow.store';

const slot = (startsAt: string): CoachingSlot => ({
  expert_id: 'expert-1',
  starts_at: startsAt,
  ends_at: new Date(new Date(startsAt).getTime() + 45 * 60 * 1000).toISOString(),
  duration_minutes: 45,
});

describe('BookingFlowStore', () => {
  it('groups available slots by local date key', async () => {
    const lateUtcSlot = '2099-05-17T22:30:00Z';
    const expectedLateUtcDate = localDateKey(lateUtcSlot);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: GroupsApiClient,
          useValue: {
            listGroups: () => of([]),
          },
        },
        {
          provide: CoachingApiClient,
          useValue: {
            listAvailableSlots: () =>
              of([slot('2099-05-17T10:00:00Z'), slot('2099-05-17T12:00:00Z'), slot(lateUtcSlot)]),
          },
        },
      ],
    });

    const store = TestBed.inject(BookingFlowStore);

    await store.loadSlots('group-1', 'expert-1', 'type-1');

    expect(store.availableDates()).toEqual(
      Array.from(new Set(['2099-05-17', expectedLateUtcDate])).sort(),
    );
    expect(store.slotsByDate().get('2099-05-17')).toHaveLength(
      expectedLateUtcDate === '2099-05-17' ? 3 : 2,
    );
    expect(store.slotsByDate().get(expectedLateUtcDate)?.at(-1)?.starts_at).toBe(lateUtcSlot);
  });

  it('clears the completed booking before a new booking flow starts', async () => {
    const booking: CoachingBooking = {
      id: 'booking-1',
      expert_id: 'expert-1',
      expert_name: 'Ada Coach',
      student_id: 'student-1',
      student_name: 'Pablo Rider',
      group_id: 'group-1',
      session_type_id: 'type-1',
      scheduled_at: '2099-05-17T10:00:00Z',
      duration_minutes: 45,
      status: 'pending',
      created_at: '2099-05-01T10:00:00Z',
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: GroupsApiClient,
          useValue: {
            listGroups: () => of([]),
          },
        },
        {
          provide: CoachingApiClient,
          useValue: {
            createBooking: () => of(booking),
          },
        },
      ],
    });

    const store = TestBed.inject(BookingFlowStore);

    await store.createBooking('group-1', {
      expert_id: 'expert-1',
      session_type_id: 'type-1',
      scheduled_at: booking.scheduled_at,
    });
    expect(store.booking()).toEqual(booking);

    store.resetBooking();

    expect(store.booking()).toBeNull();
    expect(store.mutationStatus()).toBe('idle');
  });
});
