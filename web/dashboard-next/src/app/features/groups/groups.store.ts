import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { Group, GroupsApiClient } from '../../core/http/groups-api.service';
import {
  AsyncSlice,
  errorAsyncSlice,
  idleAsyncSlice,
  loadingAsyncSlice,
  successAsyncSlice,
} from '../../core/state/async-state';

type GroupsState = AsyncSlice & {
  groups: Group[];
};

const initialState: GroupsState = {
  ...idleAsyncSlice(),
  groups: [],
};

export const GroupsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    groupCount: computed(() => store.groups().length),
    hasGroups: computed(() => store.groups().length > 0),
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
  })),
);
