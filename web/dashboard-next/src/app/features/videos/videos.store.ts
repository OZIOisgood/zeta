import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { Asset, AssetsApiClient } from '../../core/http/assets-api.service';
import {
  AsyncSlice,
  errorAsyncSlice,
  idleAsyncSlice,
  loadingAsyncSlice,
  successAsyncSlice,
} from '../../core/state/async-state';

type VideosState = AsyncSlice & {
  assets: Asset[];
};

const initialState: VideosState = {
  ...idleAsyncSlice(),
  assets: [],
};

export const VideosStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    videoCount: computed(() => store.assets().length),
    toReviewCount: computed(
      () => store.assets().filter((asset) => asset.status !== 'completed').length,
    ),
    reviewedCount: computed(
      () => store.assets().filter((asset) => asset.status === 'completed').length,
    ),
  })),
  withMethods((store, api = inject(AssetsApiClient)) => ({
    async loadVideos(): Promise<void> {
      patchState(store, loadingAsyncSlice());

      try {
        const assets = await firstValueFrom(api.listAssets());
        patchState(store, {
          ...successAsyncSlice(),
          assets,
        });
      } catch (error) {
        patchState(store, errorAsyncSlice(error));
      }
    },
  })),
);
