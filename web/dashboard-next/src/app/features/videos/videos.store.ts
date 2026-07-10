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

export type Thread = { root: Review; replies: Review[] };

type VideosState = AsyncSlice & {
  detailError: string | null;
  detailStatus: AsyncSlice['status'];
  enhancementError: string | null;
  enhancementStatus: AsyncSlice['status'];
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
  enhancementError: null,
  enhancementStatus: 'idle',
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
    threads: computed<Thread[]>(() => {
      const all = store.reviews();
      const roots = all
        .filter((r) => !r.parent_id)
        .sort((a, b) => (a.timestamp_seconds ?? 0) - (b.timestamp_seconds ?? 0));
      const byParent = new Map<string, Review[]>();
      for (const r of all) {
        if (!r.parent_id) continue;
        const list = byParent.get(r.parent_id) ?? [];
        list.push(r);
        byParent.set(r.parent_id, list);
      }
      return roots.map((root) => ({
        root,
        replies: (byParent.get(root.id) ?? []).sort((a, b) =>
          a.created_at.localeCompare(b.created_at),
        ),
      }));
    }),
  })),
  withMethods((store, api = inject(AssetsApiClient)) => ({
    async refreshVideo(assetId: string): Promise<void> {
      try {
        const asset = await firstValueFrom(api.getAsset(assetId));
        patchState(store, {
          ...successAsyncSlice(),
          activeAsset: store.activeAsset()?.id === asset.id ? asset : store.activeAsset(),
          assets: [asset, ...store.assets().filter((currentAsset) => currentAsset.id !== asset.id)],
        });
      } catch {
        // The upload succeeded, so retain any existing list data; page entry will revalidate it.
      }
    },

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
        enhancementError: null,
        enhancementStatus: 'idle',
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
    async createReview(
      videoId: string,
      content: string,
      timestampSeconds?: number,
      parentId?: string,
    ): Promise<void> {
      patchState(store, { reviewStatus: 'loading', reviewError: null });
      try {
        const review = await firstValueFrom(
          api.createReview(videoId, content, parentId ? undefined : timestampSeconds, parentId),
        );
        patchState(store, {
          activeAsset: updateAssetVideoReviewCount(store.activeAsset(), videoId, 1),
          reviewStatus: 'success',
          reviewError: null,
          reviews: [...store.reviews(), review],
        });
      } catch (error) {
        const e = errorAsyncSlice(error);
        patchState(store, { reviewStatus: e.status, reviewError: e.error });
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
            .map((review) =>
              review.id === reviewId ? { ...review, content: updatedReview.content } : review,
            ),
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
      patchState(store, { reviewStatus: 'loading', reviewError: null });
      try {
        const replyCount = store.reviews().filter((r) => r.parent_id === reviewId).length;
        await firstValueFrom(api.deleteReview(videoId, reviewId));
        patchState(store, {
          activeAsset: updateAssetVideoReviewCount(store.activeAsset(), videoId, -(1 + replyCount)),
          reviewStatus: 'success',
          reviewError: null,
          reviews: store.reviews().filter((r) => r.id !== reviewId && r.parent_id !== reviewId),
        });
      } catch (error) {
        const e = errorAsyncSlice(error);
        patchState(store, { reviewStatus: e.status, reviewError: e.error });
      }
    },
    async enhanceReviewText(text: string): Promise<string | null> {
      patchState(store, {
        enhancementError: null,
        enhancementStatus: 'loading',
      });

      try {
        const response = await firstValueFrom(api.enhanceReviewText(text));
        patchState(store, {
          enhancementError: null,
          enhancementStatus: 'success',
        });
        return response.enhanced_text;
      } catch (error) {
        const errorState = errorAsyncSlice(error);
        patchState(store, {
          enhancementError: errorState.error,
          enhancementStatus: errorState.status,
        });
        return null;
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
