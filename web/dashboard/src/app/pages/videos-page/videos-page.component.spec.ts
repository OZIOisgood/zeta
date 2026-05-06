import { describe, expect, it } from 'vitest';
import { Asset } from '../../shared/services/asset.service';
import { splitAssetsByReviewStatus } from './videos-page.utils';

function asset(id: string, status: Asset['status'], reviewCount: number): Asset {
  return {
    id,
    title: id,
    description: '',
    owner_id: 'student-1',
    status,
    review_count: reviewCount,
  };
}

describe('splitAssetsByReviewStatus', () => {
  it('groups pending videos by review progress and completed videos separately', () => {
    const buckets = splitAssetsByReviewStatus([
      asset('not-started', 'pending', 0),
      asset('started', 'pending', 2),
      asset('done', 'completed', 1),
    ]);

    expect(buckets.toReview.map((item) => item.id)).toEqual(['not-started']);
    expect(buckets.inReview.map((item) => item.id)).toEqual(['started']);
    expect(buckets.reviewed.map((item) => item.id)).toEqual(['done']);
  });
});
