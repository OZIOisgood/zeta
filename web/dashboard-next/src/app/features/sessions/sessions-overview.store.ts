import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { CoachingApiClient, CoachingBooking } from '../../core/http/coaching-api.service';
import {
  AsyncSlice,
  errorAsyncSlice,
  idleAsyncSlice,
  loadingAsyncSlice,
  successAsyncSlice,
} from '../../core/state/async-state';

type SessionsOverviewState = AsyncSlice & {
  mutationError: string | null;
  mutationStatus: AsyncSlice['status'];
  bookings: CoachingBooking[];
};

const initialState: SessionsOverviewState = {
  ...idleAsyncSlice(),
  mutationError: null,
  mutationStatus: 'idle',
  bookings: [],
};

const startsAt = (booking: CoachingBooking): number => new Date(booking.scheduled_at).getTime();

export const SessionsOverviewStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    upcomingBookings: computed(() => {
      const now = Date.now();

      return store
        .bookings()
        .filter((booking) => booking.status !== 'cancelled' && startsAt(booking) > now)
        .sort((a, b) => startsAt(a) - startsAt(b));
    }),
    completedBookings: computed(() => {
      const now = Date.now();

      return store
        .bookings()
        .filter((booking) => booking.status !== 'cancelled' && startsAt(booking) <= now)
        .sort((a, b) => startsAt(b) - startsAt(a));
    }),
    cancelledBookings: computed(() =>
      store
        .bookings()
        .filter((booking) => booking.status === 'cancelled')
        .sort((a, b) => startsAt(b) - startsAt(a)),
    ),
  })),
  withMethods((store, api = inject(CoachingApiClient)) => ({
    upsertBooking(booking: CoachingBooking): void {
      patchState(store, {
        bookings: [
          booking,
          ...store.bookings().filter((currentBooking) => currentBooking.id !== booking.id),
        ],
      });
    },

    async loadBookings(): Promise<void> {
      patchState(store, loadingAsyncSlice());

      try {
        const bookings = await firstValueFrom(api.listAllMyBookings());
        patchState(store, {
          ...successAsyncSlice(),
          bookings,
        });
      } catch (error) {
        patchState(store, errorAsyncSlice(error));
      }
    },

    async cancelBooking(
      groupId: string,
      bookingId: string,
      reason?: string,
    ): Promise<CoachingBooking | null> {
      patchState(store, {
        mutationStatus: 'loading',
        mutationError: null,
      });

      try {
        const updated = await firstValueFrom(api.cancelBooking(groupId, bookingId, reason));
        patchState(store, {
          mutationStatus: 'success',
          mutationError: null,
          bookings: store
            .bookings()
            .map((booking) => (booking.id === updated.id ? updated : booking)),
        });
        return updated;
      } catch (error) {
        const errorState = errorAsyncSlice(error);
        patchState(store, {
          mutationStatus: errorState.status,
          mutationError: errorState.error,
        });
        return null;
      }
    },
  })),
);
