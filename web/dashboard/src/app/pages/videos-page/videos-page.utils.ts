import { Asset } from '../../shared/services/asset.service';

export type ReviewStatusFilter = 'To review' | 'In review' | 'Reviewed';

export const REVIEW_STATUS_FILTERS: readonly ReviewStatusFilter[] = [
  'To review',
  'In review',
  'Reviewed',
];

export type ReviewStatusCounts = Record<ReviewStatusFilter, number>;

export function getAssetReviewStatusFilter(asset: Asset): ReviewStatusFilter | null {
  if (asset.status === 'pending' && asset.review_count === 0) {
    return 'To review';
  }

  if (asset.status === 'pending' && asset.review_count > 0) {
    return 'In review';
  }

  if (asset.status === 'completed') {
    return 'Reviewed';
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
    'To review': assets.filter((asset) => getAssetReviewStatusFilter(asset) === 'To review')
      .length,
    'In review': assets.filter((asset) => getAssetReviewStatusFilter(asset) === 'In review')
      .length,
    Reviewed: assets.filter((asset) => getAssetReviewStatusFilter(asset) === 'Reviewed').length,
  };
}
