import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { of } from 'rxjs';
import { AssetsApiClient } from '../../core/http/assets-api.service';
import { VideosPageComponent } from './videos-page.component';

describe('VideosPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        VideosPageComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              common: {
                actions: { retry: 'Retry' },
                status: { inReview: 'In review', reviewed: 'Reviewed' },
              },
              home: { error: { badge: 'Fallback state' } },
              videos: {
                all: 'All',
                allMyVideos: 'All my videos',
                comments: 'Comments',
                noVideosForStatuses: 'No videos are available for the selected review statuses.',
                noVideosMatch: 'No videos match these filters',
                noVideosYet: 'No videos yet',
                phase4: {
                  loadFailed: 'Videos could not be loaded',
                  summary: 'Review submitted videos.',
                },
                reviewStatus: { reviewed: 'Reviewed', toReview: 'To review' },
                title: 'Videos',
                uploadFirst: 'Upload your first video',
                uploadFirstDescription: 'Get started by uploading a video for review.',
                uploadNew: 'Upload new video',
              },
            },
          },
          translocoConfig: {
            availableLangs: ['en'],
            defaultLang: 'en',
          },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideRouter([]),
        {
          provide: AssetsApiClient,
          useValue: {
            listAssets: () =>
              of([
                {
                  id: 'asset-1',
                  title: 'Jump line',
                  description: 'Arena line',
                  owner_id: 'user-1',
                  status: 'pending',
                  review_count: 0,
                },
              ]),
          },
        },
      ],
    }).compileComponents();
  });

  it('renders loaded video rows using product video copy', async () => {
    const fixture = TestBed.createComponent(VideosPageComponent);

    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('All my videos');
    expect(fixture.nativeElement.textContent).toContain('Jump line');
    expect(fixture.nativeElement.textContent).toContain('In review');
  });
});
