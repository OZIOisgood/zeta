import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { GroupsStore } from '../../features/groups/groups.store';
import { SessionsOverviewStore } from '../../features/sessions/sessions-overview.store';
import { VideosStore } from '../../features/videos/videos.store';
import { HomePageComponent } from './home-page.component';

describe('HomePageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HomePageComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              common: {
                actions: { viewAll: 'View all' },
                status: { reviewed: 'Reviewed' },
              },
              groups: { myGroups: 'My Groups' },
              home: {
                firstSteps: {
                  groupCreated: 'Group created',
                  groupCreatedDescription: 'Your first group is ready.',
                  reviewVideos: 'Review submitted videos',
                  reviewVideosDescription: 'Review videos.',
                  title: 'First steps',
                  videoUploaded: 'Video uploaded',
                  videoUploadedDescription: 'Your latest videos appear here.',
                },
                latestVideos: 'Latest videos',
                upcomingCoachingSessions: 'Upcoming Sessions',
              },
              videos: { title: 'Videos' },
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
          provide: VideosStore,
          useValue: {
            loadVideos: vi.fn(),
            recentVideos: signal([
              {
                id: 'asset-1',
                title: 'Jump line',
                description: 'Arena line',
                owner_id: 'user-1',
                status: 'completed',
                review_count: 1,
                thumbnail: 'https://image.mux.com/playback-id/thumbnail.jpg',
              },
            ]),
            reviewedCount: () => 1,
            status: () => 'success',
            videoCount: () => 1,
          },
        },
        {
          provide: GroupsStore,
          useValue: {
            firstGroup: () => ({ id: 'group-1' }),
            groupCount: () => 1,
            hasGroups: () => true,
            loadGroups: vi.fn(),
            status: () => 'success',
          },
        },
        {
          provide: SessionsOverviewStore,
          useValue: {
            loadBookings: vi.fn(),
            status: () => 'success',
            upcomingBookings: () => [],
          },
        },
      ],
    }).compileComponents();
  });

  it('renders recent video previews and expands content when first steps are complete', async () => {
    const fixture = TestBed.createComponent(HomePageComponent);

    await fixture.whenStable();
    fixture.detectChanges();

    const layout = fixture.nativeElement.firstElementChild as HTMLElement;
    expect(fixture.nativeElement.querySelector('z-video-preview')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Jump line');
    expect(fixture.nativeElement.textContent).not.toContain('First steps');
    expect(layout.classList.contains('lg:grid-cols-[minmax(0,1fr)_22rem]')).toBe(false);
  });
});
