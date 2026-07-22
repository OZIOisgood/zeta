import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { BehaviorSubject, of } from 'rxjs';
import { AuthApiClient, User } from '../../core/http/auth-api.service';
import { AssetsApiClient } from '../../core/http/assets-api.service';
import { AppShellStore } from '../../core/state/app-shell.store';
import { VideoDetailsPageComponent } from './video-details-page.component';

const user: User = {
  id: 'user-1',
  email: 'expert@example.com',
  first_name: 'Ada',
  last_name: 'Expert',
  language: 'en',
  avatar: '',
  timezone: 'Europe/Rome',
  role: 'expert',
  permissions: [
    'assets:finalize',
    'reviews:create',
    'reviews:delete',
    'reviews:edit',
    'reviews:reply',
    'reviews:reply-before-ready',
    'reviews:read',
  ],
  access_status: 'active',
  email_preferences: {
    notifications_enabled: true,
    asset_uploads_enabled: true,
    asset_reviews_enabled: true,
    invitation_updates_enabled: true,
    group_membership_updates_enabled: true,
    coaching_booking_updates_enabled: true,
    coaching_reminders_enabled: true,
  },
};

describe('VideoDetailsPageComponent', () => {
  const paramMap = new BehaviorSubject(convertToParamMap({ id: 'asset-1' }));
  const queryParamMap = new BehaviorSubject(convertToParamMap({ video: '0' }));
  const shell = {
    showToast: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [
        VideoDetailsPageComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              common: {
                actions: {
                  add: 'Add',
                  back: 'Back',
                  cancel: 'Cancel',
                  delete: 'Delete',
                  done: 'Done',
                  edit: 'Edit',
                  save: 'Save',
                  send: 'Send',
                },
                fields: { group: 'Group' },
                labels: { student: 'Student' },
                status: { inReview: 'In review', reviewed: 'Reviewed' },
              },
              home: { error: { description: 'Fallback error.' } },
              videos: {
                addCommentPlaceholder: 'Add a comment...',
                commentPlaceholder: 'Comment',
                comments: 'Comments',
                cannotMarkReviewedTitle: 'Cannot mark as reviewed',
                confirmDeleteComment: 'Delete this comment?',
                confirmMarkReviewed: 'Mark reviewed?',
                cannotMarkReviewed: 'All parts need comments.',
                deleteComment: 'Delete comment',
                leaveComment: 'Leave a comment.',
                markReviewed: 'Mark as Reviewed',
                markVideoReviewed: 'Mark video as reviewed',
                noComments: 'No comments yet',
                processingUnavailable: 'Video is processing or not available.',
                reviewerNoComments: 'No comments from your reviewer.',
                reply: 'Reply',
                aiEnhancing: 'AI is enhancing your text...',
                enhanceText: 'Enhance text with AI',
                enhancing: 'Enhancing...',
                textEnhanced: 'Text enhanced successfully',
                textEnhanceFailed: 'Failed to enhance text.',
                phase4: {
                  commentsFailed: 'Comments could not be loaded.',
                  detailFailed: 'Video could not be loaded',
                  noDescription: 'No description.',
                  noVideoParts: 'No video parts.',
                  videoPart: 'Part {{count}}',
                  videoParts: 'Video parts',
                },
              },
              toast: { errorTitle: 'Something went wrong', successTitle: 'Success' },
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
        {
          provide: AuthApiClient,
          useValue: {
            getCurrentUser: () => of(user),
          },
        },
        {
          provide: AssetsApiClient,
          useValue: {
            getAsset: () =>
              of({
                id: 'asset-1',
                title: 'Jump line',
                description: 'Arena line',
                owner_id: 'user-1',
                status: 'pending',
                review_count: 1,
                student: {
                  id: 'user-1',
                  name: 'Ada Rider',
                  avatar: 'student-avatar',
                },
                group: {
                  id: 'group-1',
                  name: 'Arena Academy',
                  avatar: 'group-avatar',
                },
                videos: [
                  {
                    id: 'video-1',
                    playback_id: 'playback-1',
                    status: 'ready',
                    review_count: 1,
                  },
                  {
                    id: 'video-2',
                    playback_id: 'playback-2',
                    status: 'ready',
                    review_count: 0,
                  },
                ],
              }),
            listReviews: () =>
              of([
                {
                  id: 'review-1',
                  content: 'Great rhythm.',
                  timestamp_seconds: 12,
                  created_at: '2026-05-17T10:00:00Z',
                },
              ]),
            enhanceReviewText: () => of({ enhanced_text: 'Keep a steadier rhythm.' }),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMap.asObservable(),
            queryParamMap: queryParamMap.asObservable(),
          },
        },
        {
          provide: Router,
          useValue: {
            navigate: () => Promise.resolve(true),
          },
        },
        {
          provide: AppShellStore,
          useValue: shell,
        },
      ],
    }).compileComponents();
  });

  it('renders Mux playback, video parts, and timestamped comments', async () => {
    const fixture = TestBed.createComponent(VideoDetailsPageComponent);

    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mux-player')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Part 1');
    expect(fixture.nativeElement.textContent).toContain('Part 2');
    expect(fixture.nativeElement.textContent).toContain('Great rhythm.');
    expect(fixture.nativeElement.textContent).toContain('00:12');

    const composer = fixture.nativeElement.querySelector('[data-testid="comment-composer"]');
    expect(composer.classList).toContain('fixed');
    expect(composer.classList).toContain('bottom-0');

    const composerControls = fixture.nativeElement.querySelector(
      '[data-testid="comment-composer-controls"]',
    );
    expect(composerControls.classList).toContain('grid-cols-[auto_minmax(0,1fr)_auto]');
    expect(composerControls.classList).toContain('items-end');
    expect(composerControls.textContent).not.toContain('Send');
    expect(composerControls.textContent).not.toContain('Add');
    const sendButton = composerControls.querySelector('button[type="submit"]');
    expect(sendButton.getAttribute('aria-label')).toBe('Send');
    expect(sendButton.classList).toContain('size-11');

    const markReviewedAction = fixture.nativeElement.querySelector(
      '[data-testid="mark-reviewed-action"]',
    );
    expect(markReviewedAction.classList).toContain('w-full');
    expect(markReviewedAction.querySelector('button').classList).toContain('w-full');
  });

  it('shows the student and group identities and enhances an edited comment', async () => {
    const fixture = TestBed.createComponent(VideoDetailsPageComponent);
    const component = fixture.componentInstance;

    await fixture.whenStable();
    fixture.detectChanges();

    const student = fixture.nativeElement.querySelector('[data-testid="video-student"]');
    expect(student.textContent).toContain('Student');
    expect(student.textContent).toContain('Ada Rider');
    expect(student.querySelector('z-avatar')).toBeTruthy();

    const groupLink =
      fixture.nativeElement.querySelector('a[href="/groups/group-1"]') ??
      [...fixture.nativeElement.querySelectorAll('a')].find((el: Element) =>
        el.textContent?.includes('Arena Academy'),
      );
    expect(groupLink).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="video-group"]').textContent,
    ).toContain('Group');
    expect(groupLink.textContent).toContain('Arena Academy');
    expect(groupLink.querySelector('z-avatar')).toBeTruthy();

    component['startEditing']('review-1', 'keep rhythm');
    fixture.detectChanges();

    const actions = fixture.nativeElement.querySelector('[data-testid="edit-review-actions"]');
    expect(actions.textContent).toContain('Enhance text with AI');
    expect(actions.textContent).toContain('Cancel');
    expect(actions.textContent).toContain('Save');
    expect(actions.querySelectorAll('z-button')).toHaveLength(3);

    await component['enhanceEditedReview']();

    expect(component['editReviewControl'].value).toBe('Keep a steadier rhythm.');
    expect(shell.showToast).toHaveBeenCalledWith('Success', 'Text enhanced successfully');
  });

  it('keeps reply permission independent from the top-level composer gate', async () => {
    const fixture = TestBed.createComponent(VideoDetailsPageComponent);
    const component = fixture.componentInstance;

    await fixture.whenStable();
    fixture.detectChanges();

    expect(component['canAddReviews']()).toBe(true);
    expect(component['canReplyToReviews']()).toBe(true);
  });

  it('allows replies on reviewed videos with reply permission only', async () => {
    const reviewedUser = {
      ...user,
      permissions: ['reviews:read', 'reviews:reply'],
    };
    TestBed.overrideProvider(AuthApiClient, {
      useValue: {
        getCurrentUser: () => of(reviewedUser),
      },
    });
    TestBed.overrideProvider(AssetsApiClient, {
      useValue: {
        getAsset: () =>
          of({
            id: 'asset-1',
            title: 'Jump line',
            description: 'Arena line',
            owner_id: 'student-1',
            status: 'completed',
            review_count: 1,
            group: {
              id: 'group-1',
              name: 'Arena Academy',
              avatar: 'group-avatar',
            },
            videos: [
              {
                id: 'video-1',
                playback_id: 'playback-1',
                status: 'ready',
                review_count: 1,
              },
            ],
          }),
        listReviews: () =>
          of([
            {
              id: 'review-1',
              content: 'Great rhythm.',
              timestamp_seconds: 12,
              created_at: '2026-05-17T10:00:00Z',
            },
          ]),
        enhanceReviewText: () => of({ enhanced_text: 'Keep a steadier rhythm.' }),
      },
    });

    const fixture = TestBed.createComponent(VideoDetailsPageComponent);
    const component = fixture.componentInstance;

    await fixture.whenStable();
    fixture.detectChanges();

    expect(component['canAddReviews']()).toBe(false);
    expect(component['canReplyToReviews']()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Reply');
  });
});
