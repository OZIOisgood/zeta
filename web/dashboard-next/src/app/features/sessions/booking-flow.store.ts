import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import {
  CoachingApiClient,
  CoachingBooking,
  CoachingSlot,
  ExpertInfo,
  SessionType,
} from '../../core/http/coaching-api.service';
import { Group, GroupsApiClient } from '../../core/http/groups-api.service';
import {
  AsyncSlice,
  errorAsyncSlice,
  idleAsyncSlice,
  loadingAsyncSlice,
  successAsyncSlice,
} from '../../core/state/async-state';
import { SessionsOverviewStore } from './sessions-overview.store';

type BookingFlowState = AsyncSlice & {
  mutationError: string | null;
  mutationStatus: AsyncSlice['status'];
  slotError: string | null;
  slotStatus: AsyncSlice['status'];
  groups: Group[];
  experts: ExpertInfo[];
  sessionTypes: SessionType[];
  slots: CoachingSlot[];
  booking: CoachingBooking | null;
};

const initialState: BookingFlowState = {
  ...idleAsyncSlice(),
  mutationError: null,
  mutationStatus: 'idle',
  slotError: null,
  slotStatus: 'idle',
  groups: [],
  experts: [],
  sessionTypes: [],
  slots: [],
  booking: null,
};

export function localDateKey(isoString: string): string {
  const date = new Date(isoString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

export const BookingFlowStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    activeSessionTypes: computed(() => store.sessionTypes().filter((type) => type.is_active)),
    slotsByDate: computed(() => {
      const groups = new Map<string, CoachingSlot[]>();

      for (const slot of store.slots()) {
        const key = localDateKey(slot.starts_at);
        groups.set(key, [...(groups.get(key) ?? []), slot]);
      }

      for (const [key, slots] of groups) {
        groups.set(
          key,
          slots.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
        );
      }

      return groups;
    }),
    availableDates: computed(() =>
      Array.from(new Set(store.slots().map((slot) => localDateKey(slot.starts_at)))).sort(),
    ),
  })),
  withMethods(
    (
      store,
      coachingApi = inject(CoachingApiClient),
      groupsApi = inject(GroupsApiClient),
      sessionsOverview = inject(SessionsOverviewStore),
    ) => ({
      resetBooking(): void {
        patchState(store, {
          mutationError: null,
          mutationStatus: 'idle',
          booking: null,
        });
      },

      async loadGroups(): Promise<void> {
        patchState(store, loadingAsyncSlice());

        try {
          const groups = await firstValueFrom(groupsApi.listGroups());
          patchState(store, {
            ...successAsyncSlice(),
            groups,
          });
        } catch (error) {
          patchState(store, errorAsyncSlice(error));
        }
      },

      async loadExperts(groupId: string): Promise<void> {
        patchState(store, {
          slotError: null,
          slotStatus: 'loading',
          experts: [],
          sessionTypes: [],
          slots: [],
        });

        try {
          const experts = await firstValueFrom(coachingApi.listExperts(groupId));
          patchState(store, {
            slotStatus: 'success',
            experts,
          });
        } catch (error) {
          const errorState = errorAsyncSlice(error);
          patchState(store, {
            slotError: errorState.error,
            slotStatus: errorState.status,
          });
        }
      },

      async loadSessionTypes(groupId: string): Promise<void> {
        patchState(store, {
          slotError: null,
          slotStatus: 'loading',
          sessionTypes: [],
          slots: [],
        });

        try {
          const sessionTypes = await firstValueFrom(coachingApi.listSessionTypes(groupId));
          patchState(store, {
            slotStatus: 'success',
            sessionTypes,
          });
        } catch (error) {
          const errorState = errorAsyncSlice(error);
          patchState(store, {
            slotError: errorState.error,
            slotStatus: errorState.status,
          });
        }
      },

      async loadSlots(groupId: string, expertId: string, sessionTypeId: string): Promise<void> {
        patchState(store, {
          slotError: null,
          slotStatus: 'loading',
          slots: [],
        });

        try {
          const slots = await firstValueFrom(
            coachingApi.listAvailableSlots(groupId, expertId, sessionTypeId),
          );
          patchState(store, {
            slotStatus: 'success',
            slots,
          });
        } catch (error) {
          const errorState = errorAsyncSlice(error);
          patchState(store, {
            slotError: errorState.error,
            slotStatus: errorState.status,
          });
        }
      },

      async createBooking(
        groupId: string,
        data: {
          expert_id: string;
          session_type_id: string;
          scheduled_at: string;
          notes?: string;
        },
      ): Promise<CoachingBooking | null> {
        patchState(store, {
          mutationError: null,
          mutationStatus: 'loading',
          booking: null,
        });

        try {
          const booking = await firstValueFrom(coachingApi.createBooking(groupId, data));
          patchState(store, {
            mutationError: null,
            mutationStatus: 'success',
            booking,
          });
          sessionsOverview.upsertBooking(booking);
          return booking;
        } catch (error) {
          const errorState = errorAsyncSlice(error);
          patchState(store, {
            mutationError: errorState.error,
            mutationStatus: errorState.status,
          });
          return null;
        }
      },
    }),
  ),
);
