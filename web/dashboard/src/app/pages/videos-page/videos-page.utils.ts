import { Asset } from '../../shared/services/asset.service';

export interface ReviewStatusBuckets {
  inReview: Asset[];
  toReview: Asset[];
  reviewed: Asset[];
}

export function splitAssetsByReviewStatus(assets: Asset[]): ReviewStatusBuckets {
  return {
    inReview: assets.filter((asset) => asset.status === 'pending' && asset.review_count > 0),
    toReview: assets.filter((asset) => asset.status === 'pending' && asset.review_count === 0),
    reviewed: assets.filter((asset) => asset.status === 'completed'),
  };
}
