import { Asset } from '../../shared/services/asset.service';

export type ReviewStatusFilter = 'toReview' | 'inReview' | 'reviewed';

export const REVIEW_STATUS_FILTERS: readonly ReviewStatusFilter[] = [
  'toReview',
  'inReview',
  'reviewed',
];

export type ReviewStatusCounts = Record<ReviewStatusFilter, number>;

export function getAssetReviewStatusFilter(asset: Asset): ReviewStatusFilter | null {
  if (asset.status === 'pending' && asset.review_count === 0) {
    return 'toReview';
  }

  if (asset.status === 'pending' && asset.review_count > 0) {
    return 'inReview';
  }

  if (asset.status === 'completed') {
    return 'reviewed';
  }

  return null;
}

export function filterAssetsByReviewStatus(
  assets: Asset[],
  filters: readonly ReviewStatusFilter[],
): Asset[] {
  if (filters.length === 0) {
    return assets;
  }

  const selectedFilters = new Set(filters);

  return assets.filter((asset) => {
    const filter = getAssetReviewStatusFilter(asset);

    return filter !== null && selectedFilters.has(filter);
  });
}

export function countAssetsByReviewStatus(assets: Asset[]): ReviewStatusCounts {
  return {
    toReview: assets.filter((asset) => getAssetReviewStatusFilter(asset) === 'toReview').length,
    inReview: assets.filter((asset) => getAssetReviewStatusFilter(asset) === 'inReview').length,
    reviewed: assets.filter((asset) => getAssetReviewStatusFilter(asset) === 'reviewed').length,
  };
}
