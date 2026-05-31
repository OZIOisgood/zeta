import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import {
  CoachingApiClient,
  CoachingAvailability,
  CoachingAvailabilityResponse,
  CoachingBlockedSlot,
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

type AvailabilityState = AsyncSlice & {
  mutationError: string | null;
  mutationStatus: AsyncSlice['status'];
  activeGroup: Group | null;
  groups: Group[];
  sessionTypes: SessionType[];
  availability: CoachingAvailability[];
  blockedSlots: CoachingBlockedSlot[];
};

const initialState: AvailabilityState = {
  ...idleAsyncSlice(),
  mutationError: null,
  mutationStatus: 'idle',
  activeGroup: null,
  groups: [],
  sessionTypes: [],
  availability: [],
  blockedSlots: [],
};

function normalizeAvailabilityResponse(
  response: CoachingAvailabilityResponse,
  current: CoachingAvailability[],
  fallbackId?: string,
): CoachingAvailability[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (!fallbackId) {
    return [response, ...current];
  }

  return current.map((availability) =>
    availability.id === fallbackId ? response : availability,
  );
}

export const AvailabilityStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods(
    (store, coachingApi = inject(CoachingApiClient), groupsApi = inject(GroupsApiClient)) => {
      const loadGroupConfiguration = async (group: Group): Promise<void> => {
        patchState(store, loadingAsyncSlice());

        try {
          const [sessionTypes, availability, blockedSlots] = await Promise.all([
            firstValueFrom(coachingApi.listSessionTypes(group.id)),
            firstValueFrom(coachingApi.listMyAvailability(group.id)),
            firstValueFrom(coachingApi.listBlockedSlots(group.id)),
          ]);

          patchState(store, {
            ...successAsyncSlice(),
            activeGroup: group,
            sessionTypes,
            availability,
            blockedSlots,
          });
        } catch (error) {
          patchState(store, errorAsyncSlice(error));
        }
      };

      return {
        async loadGroups(groupId?: string): Promise<void> {
          patchState(store, {
            ...loadingAsyncSlice(),
            activeGroup: groupId ? store.activeGroup() : null,
            sessionTypes: groupId ? store.sessionTypes() : [],
            availability: groupId ? store.availability() : [],
            blockedSlots: groupId ? store.blockedSlots() : [],
          });

          try {
            const groups = await firstValueFrom(groupsApi.listGroups());
            const activeGroup = groupId
              ? groups.find((group) => group.id === groupId) ?? null
              : null;

            patchState(store, {
              ...successAsyncSlice(),
              activeGroup,
              groups,
              sessionTypes: [],
              availability: [],
              blockedSlots: [],
            });

            if (activeGroup) {
              await loadGroupConfiguration(activeGroup);
            }
          } catch (error) {
            patchState(store, errorAsyncSlice(error));
          }
        },

      async selectGroup(group: Group): Promise<void> {
        patchState(store, { activeGroup: group });
        await loadGroupConfiguration(group);
      },

      async createSessionType(data: {
        name: string;
        description: string;
        duration_minutes: number;
      }): Promise<void> {
        const group = store.activeGroup();
        if (!group) return;
        patchState(store, { mutationError: null, mutationStatus: 'loading' });

        try {
          const sessionType = await firstValueFrom(coachingApi.createSessionType(group.id, data));
          patchState(store, {
            mutationError: null,
            mutationStatus: 'success',
            sessionTypes: [sessionType, ...store.sessionTypes()],
          });
        } catch (error) {
          const errorState = errorAsyncSlice(error);
          patchState(store, {
            mutationError: errorState.error,
            mutationStatus: errorState.status,
          });
        }
      },

      async updateSessionType(
        sessionTypeId: string,
        data: { name: string; description: string; duration_minutes: number },
      ): Promise<void> {
        const group = store.activeGroup();
        if (!group) return;
        patchState(store, { mutationError: null, mutationStatus: 'loading' });

        try {
          const sessionType = await firstValueFrom(
            coachingApi.updateSessionType(group.id, sessionTypeId, data),
          );
          patchState(store, {
            mutationError: null,
            mutationStatus: 'success',
            sessionTypes: store
              .sessionTypes()
              .map((current) => (current.id === sessionType.id ? sessionType : current)),
          });
        } catch (error) {
          const errorState = errorAsyncSlice(error);
          patchState(store, {
            mutationError: errorState.error,
            mutationStatus: errorState.status,
          });
        }
      },

      async deleteSessionType(sessionTypeId: string): Promise<void> {
        const group = store.activeGroup();
        if (!group) return;
        patchState(store, { mutationError: null, mutationStatus: 'loading' });

        try {
          await firstValueFrom(coachingApi.deleteSessionType(group.id, sessionTypeId));
          patchState(store, {
            mutationError: null,
            mutationStatus: 'success',
            sessionTypes: store.sessionTypes().filter((type) => type.id !== sessionTypeId),
          });
        } catch (error) {
          const errorState = errorAsyncSlice(error);
          patchState(store, {
            mutationError: errorState.error,
            mutationStatus: errorState.status,
          });
        }
      },

      async createAvailability(data: {
        day_of_week: number;
        start_time: string;
        end_time: string;
      }): Promise<void> {
        const group = store.activeGroup();
        if (!group) return;
        patchState(store, { mutationError: null, mutationStatus: 'loading' });

        try {
          const availability = await firstValueFrom(coachingApi.createAvailability(group.id, data));
          patchState(store, {
            mutationError: null,
            mutationStatus: 'success',
            availability: normalizeAvailabilityResponse(availability, store.availability()),
          });
        } catch (error) {
          const errorState = errorAsyncSlice(error);
          patchState(store, {
            mutationError: errorState.error,
            mutationStatus: errorState.status,
          });
        }
      },

      async updateAvailability(
        availabilityId: string,
        data: { day_of_week: number; start_time: string; end_time: string },
      ): Promise<void> {
        const group = store.activeGroup();
        if (!group) return;
        patchState(store, { mutationError: null, mutationStatus: 'loading' });

        try {
          const availability = await firstValueFrom(
            coachingApi.updateAvailability(group.id, availabilityId, data),
          );
          patchState(store, {
            mutationError: null,
            mutationStatus: 'success',
            availability: normalizeAvailabilityResponse(
              availability,
              store.availability(),
              availabilityId,
            ),
          });
        } catch (error) {
          const errorState = errorAsyncSlice(error);
          patchState(store, {
            mutationError: errorState.error,
            mutationStatus: errorState.status,
          });
        }
      },

      async deleteAvailability(availabilityId: string): Promise<void> {
        const group = store.activeGroup();
        if (!group) return;
        patchState(store, { mutationError: null, mutationStatus: 'loading' });

        try {
          await firstValueFrom(coachingApi.deleteAvailability(group.id, availabilityId));
          patchState(store, {
            mutationError: null,
            mutationStatus: 'success',
            availability: store
              .availability()
              .filter((current) => current.id !== availabilityId),
          });
        } catch (error) {
          const errorState = errorAsyncSlice(error);
          patchState(store, {
            mutationError: errorState.error,
            mutationStatus: errorState.status,
          });
        }
      },

      async createBlockedSlot(data: {
        blocked_date: string;
        start_time?: string;
        end_time?: string;
        reason?: string;
      }): Promise<void> {
        const group = store.activeGroup();
        if (!group) return;
        patchState(store, { mutationError: null, mutationStatus: 'loading' });

        try {
          const blockedSlot = await firstValueFrom(coachingApi.createBlockedSlot(group.id, data));
          patchState(store, {
            mutationError: null,
            mutationStatus: 'success',
            blockedSlots: [blockedSlot, ...store.blockedSlots()],
          });
        } catch (error) {
          const errorState = errorAsyncSlice(error);
          patchState(store, {
            mutationError: errorState.error,
            mutationStatus: errorState.status,
          });
        }
      },

      async deleteBlockedSlot(blockedSlotId: string): Promise<void> {
        const group = store.activeGroup();
        if (!group) return;
        patchState(store, { mutationError: null, mutationStatus: 'loading' });

        try {
          await firstValueFrom(coachingApi.deleteBlockedSlot(group.id, blockedSlotId));
          patchState(store, {
            mutationError: null,
            mutationStatus: 'success',
            blockedSlots: store
              .blockedSlots()
              .filter((current) => current.id !== blockedSlotId),
          });
        } catch (error) {
          const errorState = errorAsyncSlice(error);
          patchState(store, {
            mutationError: errorState.error,
            mutationStatus: errorState.status,
          });
        }
      },
    };
    },
  ),
);
