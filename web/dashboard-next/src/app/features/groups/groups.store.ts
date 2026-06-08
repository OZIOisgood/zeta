import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import {
  Group,
  GroupMember,
  GroupMembersListKind,
  GroupsApiClient,
} from '../../core/http/groups-api.service';
import {
  AsyncSlice,
  errorAsyncSlice,
  idleAsyncSlice,
  loadingAsyncSlice,
  successAsyncSlice,
} from '../../core/state/async-state';

type GroupsState = AsyncSlice & {
  detailError: string | null;
  detailStatus: AsyncSlice['status'];
  mutationError: string | null;
  mutationStatus: AsyncSlice['status'];
  activeGroup: Group | null;
  groups: Group[];
  groupStudents: GroupMember[];
  groupExperts: GroupMember[];
  studentsError: string | null;
  studentsStatus: AsyncSlice['status'];
  expertsError: string | null;
  expertsStatus: AsyncSlice['status'];
};

const initialState: GroupsState = {
  ...idleAsyncSlice(),
  detailError: null,
  detailStatus: 'idle',
  mutationError: null,
  mutationStatus: 'idle',
  activeGroup: null,
  groups: [],
  groupStudents: [],
  groupExperts: [],
  studentsError: null,
  studentsStatus: 'idle',
  expertsError: null,
  expertsStatus: 'idle',
};

export const GroupsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    groupCount: computed(() => store.groups().length),
    hasGroups: computed(() => store.groups().length > 0),
    firstGroup: computed(() => store.groups()[0] ?? null),
    memberCount: computed(() => store.groupStudents().length + store.groupExperts().length),
  })),
  withMethods((store, api = inject(GroupsApiClient)) => ({
    async loadGroups(): Promise<void> {
      patchState(store, loadingAsyncSlice());

      try {
        const groups = await firstValueFrom(api.listGroups());
        patchState(store, {
          ...successAsyncSlice(),
          groups,
        });
      } catch (error) {
        patchState(store, errorAsyncSlice(error));
      }
    },
    async loadGroup(groupId: string): Promise<void> {
      patchState(store, {
        detailStatus: 'loading',
        detailError: null,
        activeGroup: null,
      });

      try {
        const activeGroup = await firstValueFrom(api.getGroup(groupId));
        patchState(store, {
          detailStatus: 'success',
          detailError: null,
          activeGroup,
        });
      } catch (error) {
        const errorState = errorAsyncSlice(error);
        patchState(store, {
          detailStatus: errorState.status,
          detailError: errorState.error,
          activeGroup: null,
        });
      }
    },
    resetGroupMembers(): void {
      patchState(store, {
        groupStudents: [],
        groupExperts: [],
        studentsError: null,
        studentsStatus: 'idle',
        expertsError: null,
        expertsStatus: 'idle',
      });
    },
    async loadGroupMembers(groupId: string, kind: GroupMembersListKind): Promise<void> {
      const loadingPatch =
        kind === 'students'
          ? { studentsStatus: 'loading' as const, studentsError: null, groupStudents: [] }
          : { expertsStatus: 'loading' as const, expertsError: null, groupExperts: [] };
      patchState(store, loadingPatch);

      try {
        const members = await firstValueFrom(api.listGroupMembers(groupId, kind));
        const successPatch =
          kind === 'students'
            ? {
                studentsStatus: 'success' as const,
                studentsError: null,
                groupStudents: members,
              }
            : {
                expertsStatus: 'success' as const,
                expertsError: null,
                groupExperts: members,
              };
        patchState(store, successPatch);
      } catch (error) {
        const errorState = errorAsyncSlice(error);
        const errorPatch =
          kind === 'students'
            ? {
                studentsStatus: errorState.status,
                studentsError: errorState.error,
                groupStudents: [],
              }
            : {
                expertsStatus: errorState.status,
                expertsError: errorState.error,
                groupExperts: [],
              };
        patchState(store, errorPatch);
      }
    },
    async removeGroupMember(groupId: string, userId: string): Promise<boolean> {
      patchState(store, {
        mutationStatus: 'loading',
        mutationError: null,
      });

      try {
        await firstValueFrom(api.removeGroupMember(groupId, userId));
        patchState(store, {
          mutationStatus: 'success',
          mutationError: null,
          groupStudents: store.groupStudents().filter((member) => member.id !== userId),
          groupExperts: store.groupExperts().filter((member) => member.id !== userId),
        });
        return true;
      } catch (error) {
        const errorState = errorAsyncSlice(error);
        patchState(store, {
          mutationStatus: errorState.status,
          mutationError: errorState.error,
        });
        return false;
      }
    },
    async leaveGroup(groupId: string): Promise<boolean> {
      patchState(store, {
        mutationStatus: 'loading',
        mutationError: null,
      });

      try {
        await firstValueFrom(api.leaveGroup(groupId));
        patchState(store, {
          mutationStatus: 'success',
          mutationError: null,
          activeGroup: store.activeGroup()?.id === groupId ? null : store.activeGroup(),
          groups: store.groups().filter((group) => group.id !== groupId),
        });
        return true;
      } catch (error) {
        const errorState = errorAsyncSlice(error);
        patchState(store, {
          mutationStatus: errorState.status,
          mutationError: errorState.error,
        });
        return false;
      }
    },
    async createGroup(data: {
      name: string;
      description?: string;
      avatar: string;
    }): Promise<Group | null> {
      patchState(store, {
        mutationStatus: 'loading',
        mutationError: null,
      });

      try {
        const group = await firstValueFrom(api.createGroup(data));
        patchState(store, {
          mutationStatus: 'success',
          mutationError: null,
          groups: [group, ...store.groups()],
        });
        return group;
      } catch (error) {
        const errorState = errorAsyncSlice(error);
        patchState(store, {
          mutationStatus: errorState.status,
          mutationError: errorState.error,
        });
        return null;
      }
    },
    async updateGroup(
      id: string,
      data: { name: string; description?: string; avatar?: string },
    ): Promise<Group | null> {
      patchState(store, {
        mutationStatus: 'loading',
        mutationError: null,
      });

      try {
        const group = await firstValueFrom(api.updateGroup(id, data));
        patchState(store, {
          mutationStatus: 'success',
          mutationError: null,
          activeGroup: group,
          groups: store.groups().map((current) => (current.id === group.id ? group : current)),
        });
        return group;
      } catch (error) {
        const errorState = errorAsyncSlice(error);
        patchState(store, {
          mutationStatus: errorState.status,
          mutationError: errorState.error,
        });
        return null;
      }
    },
    async deleteGroup(id: string): Promise<boolean> {
      patchState(store, {
        mutationStatus: 'loading',
        mutationError: null,
      });

      try {
        await firstValueFrom(api.deleteGroup(id));
        patchState(store, {
          mutationStatus: 'success',
          mutationError: null,
          activeGroup: store.activeGroup()?.id === id ? null : store.activeGroup(),
          groups: store.groups().filter((group) => group.id !== id),
        });
        return true;
      } catch (error) {
        const errorState = errorAsyncSlice(error);
        patchState(store, {
          mutationStatus: errorState.status,
          mutationError: errorState.error,
        });
        return false;
      }
    },
  })),
);
