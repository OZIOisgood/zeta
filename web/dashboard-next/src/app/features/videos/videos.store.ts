import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { Asset, AssetsApiClient, Review } from '../../core/http/assets-api.service';
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
  reviewError: string | null;
  reviewStatus: AsyncSlice['status'];
  reviews: Review[];
};

const initialState: VideosState = {
  ...idleAsyncSlice(),
  detailError: null,
  detailStatus: 'idle',
  activeAsset: null,
  assets: [],
  reviewError: null,
  reviewStatus: 'idle',
  reviews: [],
};

function updateAssetVideoReviewCount(
  asset: Asset | null,
  videoId: string,
  delta: number,
): Asset | null {
  if (!asset?.videos) return asset;

  const videos = asset.videos.map((video) => {
    if (video.id !== videoId) return video;

    return {
      ...video,
      review_count: Math.max(0, video.review_count + delta),
    };
  });

  return {
    ...asset,
    review_count: Math.max(0, asset.review_count + delta),
    videos,
  };
}

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
        reviewError: null,
        reviewStatus: 'idle',
        reviews: [],
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
          reviewError: null,
          reviewStatus: 'idle',
          reviews: [],
        });
      }
    },
    async loadReviews(videoId: string): Promise<void> {
      patchState(store, {
        reviewStatus: 'loading',
        reviewError: null,
      });

      try {
        const reviews = await firstValueFrom(api.listReviews(videoId));
        patchState(store, {
          reviewStatus: 'success',
          reviewError: null,
          reviews,
        });
      } catch (error) {
        const errorState = errorAsyncSlice(error);
        patchState(store, {
          reviewStatus: errorState.status,
          reviewError: errorState.error,
          reviews: [],
        });
      }
    },
    async createReview(videoId: string, content: string, timestampSeconds?: number): Promise<void> {
      patchState(store, {
        reviewStatus: 'loading',
        reviewError: null,
      });

      try {
        const review = await firstValueFrom(api.createReview(videoId, content, timestampSeconds));
        patchState(store, {
          activeAsset: updateAssetVideoReviewCount(store.activeAsset(), videoId, 1),
          reviewStatus: 'success',
          reviewError: null,
          reviews: [...store.reviews(), review],
        });
      } catch (error) {
        const errorState = errorAsyncSlice(error);
        patchState(store, {
          reviewStatus: errorState.status,
          reviewError: errorState.error,
        });
      }
    },
    async updateReview(videoId: string, reviewId: string, content: string): Promise<void> {
      patchState(store, {
        reviewStatus: 'loading',
        reviewError: null,
      });

      try {
        const updatedReview = await firstValueFrom(api.updateReview(videoId, reviewId, content));
        patchState(store, {
          reviewStatus: 'success',
          reviewError: null,
          reviews: store
            .reviews()
            .map((review) => (review.id === reviewId ? updatedReview : review)),
        });
      } catch (error) {
        const errorState = errorAsyncSlice(error);
        patchState(store, {
          reviewStatus: errorState.status,
          reviewError: errorState.error,
        });
      }
    },
    async deleteReview(videoId: string, reviewId: string): Promise<void> {
      patchState(store, {
        reviewStatus: 'loading',
        reviewError: null,
      });

      try {
        await firstValueFrom(api.deleteReview(videoId, reviewId));
        patchState(store, {
          activeAsset: updateAssetVideoReviewCount(store.activeAsset(), videoId, -1),
          reviewStatus: 'success',
          reviewError: null,
          reviews: store.reviews().filter((review) => review.id !== reviewId),
        });
      } catch (error) {
        const errorState = errorAsyncSlice(error);
        patchState(store, {
          reviewStatus: errorState.status,
          reviewError: errorState.error,
        });
      }
    },
    async finalizeVideo(assetId: string): Promise<void> {
      patchState(store, {
        detailStatus: 'loading',
        detailError: null,
      });

      try {
        await firstValueFrom(api.finalizeAsset(assetId));
        const activeAsset = await firstValueFrom(api.getAsset(assetId));
        patchState(store, {
          detailStatus: 'success',
          detailError: null,
          activeAsset,
          assets: store
            .assets()
            .map((asset) => (asset.id === activeAsset.id ? activeAsset : asset)),
        });
      } catch (error) {
        const errorState = errorAsyncSlice(error);
        patchState(store, {
          detailStatus: errorState.status,
          detailError: errorState.error,
        });
      }
    },
  })),
);
