import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
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

  it('adds a newly uploaded video to the shared list', async () => {
    const uploaded = { ...assets[0], id: 'asset-3', title: 'New upload' };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AssetsApiClient,
          useValue: {
            listAssets: () => of(assets),
            getAsset: () => of(uploaded),
          },
        },
      ],
    });

    const store = TestBed.inject(VideosStore);
    await store.loadVideos();
    await store.refreshVideo(uploaded.id);

    expect(store.assets().map((asset) => asset.id)).toEqual(['asset-3', 'asset-1', 'asset-2']);
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

describe('threads computed', () => {
  it('groups replies under root, sorts roots by timestamp_seconds', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AssetsApiClient,
          useValue: {
            listReviews: () =>
              of([
                {
                  id: 'r2',
                  content: 'Second root',
                  timestamp_seconds: 5,
                  created_at: '2026-01-01T00:01:00Z',
                },
                {
                  id: 'r1',
                  content: 'First root',
                  timestamp_seconds: 10,
                  created_at: '2026-01-01T00:00:00Z',
                },
                {
                  id: 'rep1',
                  content: 'Reply A',
                  parent_id: 'r1',
                  created_at: '2026-01-01T00:02:00Z',
                },
                {
                  id: 'rep2',
                  content: 'Reply B',
                  parent_id: 'r1',
                  created_at: '2026-01-01T00:03:00Z',
                },
              ] as Review[]),
          },
        },
      ],
    });

    const store = TestBed.inject(VideosStore);
    await store.loadReviews('video-1');

    const threads = store.threads();
    expect(threads.length).toBe(2);
    // r2 has timestamp 5, comes first
    expect(threads[0].root.id).toBe('r2');
    expect(threads[0].replies.length).toBe(0);
    // r1 has timestamp 10, comes second, with two replies in order
    expect(threads[1].root.id).toBe('r1');
    expect(threads[1].replies.map((r) => r.id)).toEqual(['rep1', 'rep2']);
  });

  it('createReview with parentId sends no timestamp to API', async () => {
    const createReview = vi.fn().mockReturnValue(
      of({
        id: 'rep3',
        content: 'New reply',
        parent_id: 'r1',
        created_at: '2026-01-01T00:04:00Z',
      } as Review),
    );
    TestBed.configureTestingModule({
      providers: [{ provide: AssetsApiClient, useValue: { createReview } }],
    });

    const store = TestBed.inject(VideosStore);
    await store.createReview('video-1', 'New reply', 30, 'r1');

    expect(createReview).toHaveBeenCalledWith('video-1', 'New reply', undefined, 'r1');
  });

  it('deleteReview also removes replies from state', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AssetsApiClient,
          useValue: {
            listReviews: () =>
              of([
                {
                  id: 'r1',
                  content: 'Root',
                  timestamp_seconds: 0,
                  created_at: '2026-01-01T00:00:00Z',
                },
                {
                  id: 'rep1',
                  content: 'Reply',
                  parent_id: 'r1',
                  created_at: '2026-01-01T00:01:00Z',
                },
              ] as Review[]),
            deleteReview: () => of(undefined),
          },
        },
      ],
    });

    const store = TestBed.inject(VideosStore);
    await store.loadReviews('video-1');
    await store.deleteReview('video-1', 'r1');

    expect(store.reviews().length).toBe(0);
  });
});
