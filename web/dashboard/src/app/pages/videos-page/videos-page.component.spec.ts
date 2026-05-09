import { describe, expect, it } from 'vitest';
import { Asset } from '../../shared/services/asset.service';
import { countAssetsByReviewStatus, filterAssetsByReviewStatus } from './videos-page.utils';

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

describe('review status filters', () => {
  it('filters pending videos by review progress and completed videos separately', () => {
    const assets = [
      asset('not-started', 'pending', 0),
      asset('started', 'pending', 2),
      asset('done', 'completed', 1),
    ];

    expect(filterAssetsByReviewStatus(assets, ['toReview']).map((item) => item.id)).toEqual([
      'not-started',
    ]);
    expect(filterAssetsByReviewStatus(assets, ['inReview']).map((item) => item.id)).toEqual([
      'started',
    ]);
    expect(filterAssetsByReviewStatus(assets, ['reviewed']).map((item) => item.id)).toEqual([
      'done',
    ]);
  });

  it('shows all videos when no review status filter is selected', () => {
    const assets = [
      asset('not-started', 'pending', 0),
      asset('started', 'pending', 2),
      asset('done', 'completed', 1),
    ];

    expect(filterAssetsByReviewStatus(assets, []).map((item) => item.id)).toEqual([
      'not-started',
      'started',
      'done',
    ]);
  });

  it('counts videos for filter badges', () => {
    const counts = countAssetsByReviewStatus([
      asset('not-started', 'pending', 0),
      asset('started', 'pending', 2),
      asset('done', 'completed', 1),
    ]);

    expect(counts).toEqual({
      toReview: 1,
      inReview: 1,
      reviewed: 1,
    });
  });
});
