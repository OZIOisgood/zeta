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
  detailError: string | null;
  detailStatus: AsyncSlice['status'];
  activeAsset: Asset | null;
  assets: Asset[];
};

const initialState: VideosState = {
  ...idleAsyncSlice(),
  detailError: null,
  detailStatus: 'idle',
  activeAsset: null,
  assets: [],
};

export const VideosStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    videoCount: computed(() => store.assets().length),
    recentVideos: computed(() => store.assets().slice(0, 4)),
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
    async loadVideo(assetId: string): Promise<void> {
      patchState(store, {
        detailStatus: 'loading',
        detailError: null,
        activeAsset: null,
      });

      try {
        const activeAsset = await firstValueFrom(api.getAsset(assetId));
        patchState(store, {
          detailStatus: 'success',
          detailError: null,
          activeAsset,
        });
      } catch (error) {
        const errorState = errorAsyncSlice(error);
        patchState(store, {
          detailStatus: errorState.status,
          detailError: errorState.error,
          activeAsset: null,
        });
      }
    },
  })),
);
