import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Asset, AssetsApiClient } from '../../core/http/assets-api.service';
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
});
