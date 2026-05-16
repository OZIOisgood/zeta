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
  bookings: CoachingBooking[];
};

const initialState: SessionsOverviewState = {
  ...idleAsyncSlice(),
  bookings: [],
};

export const SessionsOverviewStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    upcomingBookings: computed(() =>
      store.bookings().filter((booking) => booking.status === 'pending'),
    ),
    completedBookings: computed(() =>
      store.bookings().filter((booking) => booking.status === 'done'),
    ),
    cancelledBookings: computed(() =>
      store.bookings().filter((booking) => booking.status === 'cancelled'),
    ),
  })),
  withMethods((store, api = inject(CoachingApiClient)) => ({
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
  })),
);
