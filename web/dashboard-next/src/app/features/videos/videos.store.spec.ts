import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Asset, AssetsApiClient, Review } from '../../core/http/assets-api.service';
import { VideosStore } from './videos.store';

const assets: Asset[] = [
  {
    id: 'asset-1',
    title: 'Jump line',
    description: 'Arena line',
    owner_id: 'user-1',
    status: 'pending',
    review_count: 0,
  },
  {
    id: 'asset-2',
    title: 'Flat work',
    description: 'Warmup',
    owner_id: 'user-1',
    status: 'completed',
    review_count: 2,
  },
];

const reviews: Review[] = [
  {
    id: 'review-1',
    content: 'Great rhythm.',
    timestamp_seconds: 12,
    created_at: '2026-05-17T10:00:00Z',
  },
];

describe('VideosStore', () => {
  it('loads assets and derives video counts', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AssetsApiClient,
          useValue: {
            listAssets: () => of(assets),
          },
        },
      ],
    });

    const store = TestBed.inject(VideosStore);

    await store.loadVideos();

    expect(store.status()).toBe('success');
    expect(store.videoCount()).toBe(2);
    expect(store.toReviewCount()).toBe(1);
    expect(store.reviewedCount()).toBe(1);
  });

  it('keeps existing assets and records an error when loading fails', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AssetsApiClient,
          useValue: {
            listAssets: () => throwError(() => new Error('Network unavailable')),
          },
        },
      ],
    });

    const store = TestBed.inject(VideosStore);

    await store.loadVideos();

    expect(store.status()).toBe('error');
    expect(store.error()).toBe('Network unavailable');
    expect(store.videoCount()).toBe(0);
  });

  it('loads and creates reviews for the active video part', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AssetsApiClient,
          useValue: {
            getAsset: () =>
              of({
                ...assets[0],
                videos: [
                  { id: 'video-1', playback_id: 'playback-1', status: 'ready', review_count: 0 },
                ],
              }),
            listReviews: () => of(reviews),
            createReview: () =>
              of({
                id: 'review-2',
                content: 'Add more release.',
                timestamp_seconds: 22,
                created_at: '2026-05-17T10:01:00Z',
              }),
          },
        },
      ],
    });

    const store = TestBed.inject(VideosStore);

    await store.loadVideo('asset-1');
    await store.loadReviews('video-1');
    await store.createReview('video-1', 'Add more release.', 22);

    expect(store.reviews().map((review) => review.content)).toEqual([
      'Great rhythm.',
      'Add more release.',
    ]);
    expect(store.activeAsset()?.review_count).toBe(1);
    expect(store.activeAsset()?.videos?.[0].review_count).toBe(1);
  });

  it('enhances review text without changing the review loading state', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AssetsApiClient,
          useValue: {
            enhanceReviewText: () => of({ enhanced_text: 'Keep a steadier rhythm.' }),
          },
        },
      ],
    });

    const store = TestBed.inject(VideosStore);

    const enhancedText = await store.enhanceReviewText('keep rhythm');

    expect(enhancedText).toBe('Keep a steadier rhythm.');
    expect(store.enhancementStatus()).toBe('success');
    expect(store.reviewStatus()).toBe('idle');
  });
});
