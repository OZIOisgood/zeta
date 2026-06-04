import { NgClass } from '@angular/common';
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgpDialogTrigger } from 'ng-primitives/dialog';
import {
  LucideCheck,
  LucideChevronDown,
  LucideChevronRight,
  LucideClock,
  LucideMessageCircle,
  LucidePlay,
  LucideSendHorizontal,
  LucideSparkles,
  LucideVideo,
} from '@lucide/angular';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AppShellStore } from '../../core/state/app-shell.store';
import { DashboardDateTimeService } from '../../core/i18n/dashboard-date-time.service';
import { RelativeTimePipe } from '../../core/i18n/relative-time.pipe';
import { SessionStore } from '../../features/session/session.store';
import { Thread, VideosStore } from '../../features/videos/videos.store';
import { ZAvatarComponent } from '../../shared/ui/avatar/z-avatar.component';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZBreadcrumbsComponent } from '../../shared/ui/breadcrumbs/z-breadcrumbs.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZCommentActionsComponent } from '../../shared/ui/comment-actions/z-comment-actions.component';
import { ZDialogPanelComponent } from '../../shared/ui/dialog/z-dialog-panel.component';
import { ZEmptyStateComponent } from '../../shared/ui/empty-state/z-empty-state.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';
import { ZTextareaComponent } from '../../shared/ui/textarea/z-textarea.component';

@Component({
  selector: 'app-video-details-page',
  imports: [
    NgClass,
    ReactiveFormsModule,
    NgpDialogTrigger,
    RouterLink,
    TranslocoPipe,
    RelativeTimePipe,
    ZAvatarComponent,
    ZBadgeComponent,
    ZBreadcrumbsComponent,
    ZButtonComponent,
    ZCommentActionsComponent,
    ZDialogPanelComponent,
    ZEmptyStateComponent,
    ZSkeletonComponent,
    ZTextareaComponent,
    LucideCheck,
    LucideChevronDown,
    LucideChevronRight,
    LucideClock,
    LucideMessageCircle,
    LucidePlay,
    LucideSendHorizontal,
    LucideSparkles,
    LucideVideo,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="grid gap-6">
      @if (store.detailStatus() === 'loading') {
        <z-breadcrumbs
          [items]="[
            { label: 'common.nav.videos', routerLink: '/videos' },
            { label: '...', translate: false },
          ]"
        />
        <section class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]" aria-hidden="true">
          <z-skeleton class="block aspect-video w-full"></z-skeleton>
          <z-skeleton class="block h-64 w-full"></z-skeleton>
        </section>
      } @else if (store.detailStatus() === 'error') {
        <z-breadcrumbs
          [items]="[
            { label: 'common.nav.videos', routerLink: '/videos' },
            { label: 'videos.phase4.detailFailed' },
          ]"
        />
        <z-empty-state
          [title]="'videos.phase4.detailFailed' | transloco"
          [description]="store.detailError() || ('home.error.description' | transloco)"
        />
      } @else if (store.activeAsset(); as asset) {
        <z-breadcrumbs
          [items]="[
            { label: 'common.nav.videos', routerLink: '/videos' },
            { label: asset.title, translate: false },
          ]"
        />
        <section class="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div class="grid min-w-0 gap-4">
            <div
              class="overflow-hidden rounded-lg border border-[var(--z-border)] bg-black shadow-sm"
            >
              @if (playbackId(); as playbackId) {
                <mux-player
                  #muxPlayer
                  class="block aspect-video w-full"
                  [attr.playback-id]="playbackId"
                  [attr.metadata-video-title]="asset.title"
                  stream-type="on-demand"
                  accent-color="#ea580c"
                  primary-color="#ffffff"
                  secondary-color="#26180f"
                ></mux-player>
              } @else {
                <div
                  class="grid aspect-video place-items-center bg-[var(--z-surface-warm)] px-6 text-center text-[var(--z-primary)]"
                >
                  <div>
                    <svg lucideVideo class="mx-auto size-12" aria-hidden="true"></svg>
                    <p class="mt-3 text-sm font-semibold">
                      {{ 'videos.processingUnavailable' | transloco }}
                    </p>
                  </div>
                </div>
              }
            </div>

            <section class="rounded-lg border border-[var(--z-border)] bg-white p-4 shadow-sm">
              <div class="-mx-4 flex items-center gap-2 border-b border-[var(--z-border)] px-4 pb-3">
                <svg
                  lucideMessageCircle
                  class="size-4 text-[var(--z-primary)]"
                  aria-hidden="true"
                ></svg>
                <h3 class="text-sm font-semibold">{{ 'videos.comments' | transloco }}</h3>
                @if (selectedVideo(); as video) {
                  <z-badge>{{ video.review_count }}</z-badge>
                }
              </div>

              @if (!selectedVideo()) {
                <p class="mt-3 text-sm leading-6 text-[var(--z-muted)]">
                  {{ 'videos.phase4.noVideoParts' | transloco }}
                </p>
              } @else if (store.reviewStatus() === 'loading') {
                <div class="mt-4 grid gap-3" aria-hidden="true">
                  <z-skeleton class="block h-28 w-full"></z-skeleton>
                  <z-skeleton class="block h-28 w-full"></z-skeleton>
                </div>
              } @else if (store.reviewStatus() === 'error') {
                <p class="mt-3 text-sm leading-6 text-rose-700">
                  {{ store.reviewError() || ('videos.phase4.commentsFailed' | transloco) }}
                </p>
              } @else if (store.reviews().length === 0) {
                <z-empty-state
                  class="mt-4 block"
                  [title]="'videos.noComments' | transloco"
                  [description]="
                    canAddReviews()
                      ? ('videos.leaveComment' | transloco)
                      : ('videos.reviewerNoComments' | transloco)
                  "
                />
              } @else {
                <div class="mt-2">
                  @for (thread of store.threads(); track thread.root.id) {
                    <article class="group border-t border-[var(--z-border)] py-4 first:border-t-0 first:pt-2">

                      <!-- Root: avatar + content column -->
                      <div class="comment-hoverable flex items-start gap-2">
                        <z-avatar
                          class="size-9 shrink-0"
                          [image]="thread.root.author?.avatar"
                          [fallback]="authorInitials(thread.root.author?.name)"
                          [alt]="thread.root.author?.name ?? ('videos.unknownAuthor' | transloco)"
                        />
                        <div class="min-w-0 flex-1">
                          <!-- name + time + timestamp badge + actions on one line -->
                          <div class="flex items-center gap-2">
                            <p class="min-w-0 truncate text-sm font-semibold">
                              {{ thread.root.author?.name ?? ('videos.unknownAuthor' | transloco) }}
                            </p>
                            <p
                              class="shrink-0 text-xs text-[var(--z-muted)]"
                              [title]="formatAbsolute(thread.root.created_at)"
                            >
                              {{ thread.root.created_at | relativeTime }}
                            </p>
                            @if (thread.root.timestamp_seconds !== undefined && thread.root.timestamp_seconds !== null) {
                              <button
                                type="button"
                                class="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--z-surface-warm)] px-2.5 py-1 text-xs font-semibold text-[var(--z-primary-strong)] transition hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)]"
                                (click)="seekTo(thread.root.timestamp_seconds)"
                              >
                                <svg lucidePlay class="size-3" aria-hidden="true"></svg>
                                {{ formatTimestamp(thread.root.timestamp_seconds) }}
                              </button>
                            }
                            @if (canEditReviews() || canDeleteReviews()) {
                              <z-comment-actions
                                class="ml-auto"
                                [canEdit]="canEditReviews()"
                                [canDelete]="canDeleteReviews()"
                                (edit)="startEditing(thread.root.id, thread.root.content)"
                                (delete)="doDeleteReview(thread.root.id)"
                              />
                            }
                          </div>

                          <!-- body or edit form -->
                          @if (editingReviewId() === thread.root.id) {
                            <form class="mt-2 grid gap-3" (submit)="saveEditedReview($event, thread.root.id)">
                              <z-textarea
                                [formControl]="editReviewControl"
                                [placeholder]="'videos.commentPlaceholder' | transloco"
                                [rows]="4"
                              />
                              <div class="flex flex-wrap items-center justify-between gap-2" data-testid="edit-review-actions">
                                <z-button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  [disabled]="!editReviewControl.value.trim() || store.enhancementStatus() === 'loading'"
                                  (pressed)="enhanceEditedReview()"
                                >
                                  <svg lucideSparkles class="size-4" aria-hidden="true"></svg>
                                  <span>{{
                                    (store.enhancementStatus() === 'loading' ? 'videos.enhancing' : 'videos.enhanceText') | transloco
                                  }}</span>
                                </z-button>
                                <div class="ml-auto flex gap-2">
                                  <z-button type="button" size="sm" variant="secondary" (pressed)="cancelEditing()">
                                    {{ 'common.actions.cancel' | transloco }}
                                  </z-button>
                                  <z-button
                                    type="submit"
                                    size="sm"
                                    [disabled]="!editReviewControl.value.trim() || store.enhancementStatus() === 'loading'"
                                  >
                                    {{ 'common.actions.save' | transloco }}
                                  </z-button>
                                </div>
                              </div>
                            </form>
                          } @else {
                            <p class="mt-1 whitespace-pre-wrap text-sm leading-6">{{ thread.root.content }}</p>
                            @if (canAddReviews()) {
                              <button
                                type="button"
                                class="mt-1 text-xs font-semibold text-[var(--z-muted)] transition hover:text-[var(--z-primary-strong)]"
                                (click)="openReply(thread.root.id)"
                              >
                                {{ 'videos.reply' | transloco }}
                              </button>
                            }
                          }
                        </div>
                      </div>

                      <!-- Collapse toggle (only shown when there are replies) -->
                      @if (thread.replies.length > 0) {
                        <button
                          type="button"
                          class="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--z-primary-strong)]"
                          [attr.aria-expanded]="!collapsedThreads().has(thread.root.id)"
                          (click)="toggleThread(thread.root.id)"
                        >
                          @if (collapsedThreads().has(thread.root.id)) {
                            <svg lucideChevronRight class="size-4" aria-hidden="true"></svg>
                          } @else {
                            <svg lucideChevronDown class="size-4" aria-hidden="true"></svg>
                          }
                          {{ thread.replies.length }}
                          {{ (thread.replies.length === 1 ? 'videos.reply.one' : 'videos.reply.other') | transloco }}
                        </button>
                      }

                      <!-- Replies + composer (hidden when collapsed) -->
                      @if (!collapsedThreads().has(thread.root.id)) {
                        @if (thread.replies.length > 0) {
                          <div class="ml-5 mt-3 grid gap-4 pl-5">
                            @for (reply of thread.replies; track reply.id) {
                              <div animate.enter="z-list-enter" class="comment-hoverable group flex items-start gap-2">
                                <z-avatar
                                  class="size-7 shrink-0"
                                  [image]="reply.author?.avatar"
                                  [fallback]="authorInitials(reply.author?.name)"
                                  [alt]="reply.author?.name ?? ('videos.unknownAuthor' | transloco)"
                                />
                                <div class="min-w-0 flex-1">
                                  <div class="flex items-center gap-2">
                                    <p class="min-w-0 truncate text-sm font-semibold">
                                      {{ reply.author?.name ?? ('videos.unknownAuthor' | transloco) }}
                                    </p>
                                    <p
                                      class="shrink-0 text-xs text-[var(--z-muted)]"
                                      [title]="formatAbsolute(reply.created_at)"
                                    >
                                      {{ reply.created_at | relativeTime }}
                                    </p>
                                    @if (canEditReviews() || canDeleteReviews()) {
                                      <z-comment-actions
                                        class="ml-auto"
                                        [canEdit]="canEditReviews()"
                                        [canDelete]="canDeleteReviews()"
                                        (edit)="startEditing(reply.id, reply.content)"
                                        (delete)="doDeleteReview(reply.id)"
                                      />
                                    }
                                  </div>

                                  @if (editingReviewId() === reply.id) {
                                    <form class="mt-2 grid gap-3" (submit)="saveEditedReview($event, reply.id)">
                                      <z-textarea
                                        [formControl]="editReviewControl"
                                        [placeholder]="'videos.commentPlaceholder' | transloco"
                                        [rows]="3"
                                      />
                                      <div class="flex flex-wrap items-center justify-between gap-2" data-testid="edit-reply-actions">
                                        <z-button
                                          type="button"
                                          size="sm"
                                          variant="secondary"
                                          [disabled]="!editReviewControl.value.trim() || store.enhancementStatus() === 'loading'"
                                          (pressed)="enhanceEditedReview()"
                                        >
                                          <svg lucideSparkles class="size-4" aria-hidden="true"></svg>
                                          <span>{{
                                            (store.enhancementStatus() === 'loading' ? 'videos.enhancing' : 'videos.enhanceText') | transloco
                                          }}</span>
                                        </z-button>
                                        <div class="ml-auto flex gap-2">
                                          <z-button type="button" size="sm" variant="secondary" (pressed)="cancelEditing()">
                                            {{ 'common.actions.cancel' | transloco }}
                                          </z-button>
                                          <z-button
                                            type="submit"
                                            size="sm"
                                            [disabled]="!editReviewControl.value.trim() || store.enhancementStatus() === 'loading'"
                                          >
                                            {{ 'common.actions.save' | transloco }}
                                          </z-button>
                                        </div>
                                      </div>
                                    </form>
                                  } @else {
                                    <p class="mt-1 whitespace-pre-wrap text-sm leading-6">{{ reply.content }}</p>
                                    @if (canAddReviews()) {
                                      <button
                                        type="button"
                                        class="mt-1 text-xs font-semibold text-[var(--z-muted)] transition hover:text-[var(--z-primary-strong)]"
                                        (click)="openReply(thread.root.id)"
                                      >
                                        {{ 'videos.reply' | transloco }}
                                      </button>
                                    }
                                  }
                                </div>
                              </div>
                            }
                          </div>
                        }

                        <!-- Inline reply composer -->
                        @if (openReplyFor() === thread.root.id) {
                          <form
                            class="ml-5 mt-3 grid gap-2 pl-5"
                            (submit)="postReply($event, thread.root.id)"
                          >
                            <div class="flex items-start gap-2">
                              <z-avatar
                                class="mt-0.5 size-7 shrink-0"
                                [image]="session.user()?.avatar"
                                [fallback]="authorInitials(session.displayName())"
                                [alt]="session.displayName()"
                              />
                              <z-textarea
                                #replyTextarea
                                class="flex-1"
                                [formControl]="replyControl"
                                [placeholder]="'videos.replyPlaceholder' | transloco"
                                [rows]="2"
                                (keydown)="onReplyKeydown($event, thread.root.id)"
                              />
                            </div>
                            <div class="flex justify-end gap-2 pl-9">
                              <z-button type="button" size="sm" variant="ghost" (pressed)="cancelReply()">
                                {{ 'common.actions.cancel' | transloco }}
                              </z-button>
                              <z-button
                                type="submit"
                                size="sm"
                                [disabled]="!replyControl.value.trim() || store.reviewStatus() === 'loading'"
                              >
                                {{ 'videos.reply' | transloco }}
                              </z-button>
                            </div>
                          </form>
                        }
                      }

                    </article>
                  }
                </div>
              }
            </section>
          </div>

          <aside class="grid gap-4 content-start xl:sticky xl:top-6">
            <section class="rounded-lg border border-[var(--z-border)] bg-white p-4 shadow-sm">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-sm font-semibold">{{ 'videos.phase4.videoParts' | transloco }}</h3>
                <z-badge>{{ asset.videos?.length ?? 0 }}</z-badge>
              </div>
              <div class="mt-4 grid gap-2">
                @for (video of asset.videos ?? []; track video.id; let index = $index) {
                  <button
                    type="button"
                    class="flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left transition hover:bg-[var(--z-surface-warm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)]"
                    [ngClass]="
                      selectedVideoIndex() === index
                        ? 'border-[var(--z-primary)] bg-[var(--z-surface-warm)]'
                        : 'border-[var(--z-border)]'
                    "
                    (click)="selectVideoPart(index)"
                  >
                    <div class="min-w-0">
                      <p class="truncate text-sm font-semibold">
                        {{ 'videos.phase4.videoPart' | transloco: { count: index + 1 } }}
                      </p>
                      <p class="mt-1 text-xs text-[var(--z-muted)]">{{ video.status }}</p>
                    </div>
                    <z-badge>{{ video.review_count }}</z-badge>
                  </button>
                } @empty {
                  <p class="text-sm leading-6 text-[var(--z-muted)]">
                    {{ 'videos.phase4.noVideoParts' | transloco }}
                  </p>
                }
              </div>
            </section>

            <section class="rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <z-badge [tone]="asset.status === 'completed' ? 'success' : 'primary'">
                    {{
                      asset.status === 'completed'
                        ? ('common.status.reviewed' | transloco)
                        : ('common.status.inReview' | transloco)
                    }}
                  </z-badge>
                  <h2 class="mt-3 text-xl font-semibold leading-tight">{{ asset.title }}</h2>
                  @if (asset.group) {
                    <a
                      class="mt-3 inline-flex max-w-full items-center gap-2 rounded-md text-sm font-semibold text-[var(--z-primary)] transition hover:text-[var(--z-primary-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)]"
                      [routerLink]="['/groups', asset.group.id]"
                    >
                      <z-avatar
                        class="size-9"
                        [image]="asset.group.avatar"
                        [fallback]="groupInitials(asset.group.name)"
                        [alt]="asset.group.name"
                      />
                      <span class="truncate">{{ asset.group.name }}</span>
                    </a>
                  }
                </div>
                @if (canFinalize() && !isFinalized()) {
                  @if (hasUnreviewedParts()) {
                    <ng-template #cannotMarkReviewedDialog let-close="close">
                      <z-dialog-panel
                        [title]="'videos.cannotMarkReviewedTitle' | transloco"
                        [description]="'videos.cannotMarkReviewed' | transloco"
                        tone="info"
                        [confirmOnly]="true"
                        [confirmLabel]="'common.actions.done' | transloco"
                        [close]="close"
                      />
                    </ng-template>
                    <z-button size="sm" [ngpDialogTrigger]="cannotMarkReviewedDialog">
                      <svg lucideCheck class="size-4" aria-hidden="true"></svg>
                      <span>{{ 'videos.markReviewed' | transloco }}</span>
                    </z-button>
                  } @else {
                    <ng-template #markReviewedDialog let-close="close">
                      <z-dialog-panel
                        [title]="'videos.markVideoReviewed' | transloco"
                        [description]="'videos.confirmMarkReviewed' | transloco"
                        tone="warning"
                        [confirmLabel]="'videos.markReviewed' | transloco"
                        [cancelLabel]="'common.actions.cancel' | transloco"
                        [close]="close"
                      />
                    </ng-template>
                    <z-button
                      size="sm"
                      [ngpDialogTrigger]="markReviewedDialog"
                      (ngpDialogTriggerClosed)="confirmFinalizeVideo($event)"
                    >
                      <svg lucideCheck class="size-4" aria-hidden="true"></svg>
                      <span>{{ 'videos.markReviewed' | transloco }}</span>
                    </z-button>
                  }
                }
              </div>

              <p class="mt-4 whitespace-pre-wrap text-sm leading-6 text-[var(--z-muted)]">
                {{ asset.description || ('videos.phase4.noDescription' | transloco) }}
              </p>
            </section>
          </aside>
        </section>

        @if (showCommentBar()) {
          <div class="h-24" aria-hidden="true"></div>
          <form
            class="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--z-border)] bg-white/95 px-4 py-3 shadow-lg backdrop-blur sm:px-6 lg:left-64 lg:px-8"
            data-testid="comment-composer"
            (submit)="postReview($event)"
          >
            <div
              class="mx-auto grid max-w-6xl gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-end"
            >
              <div
                class="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--z-border)] bg-[var(--z-surface-warm)] px-3 text-sm font-semibold text-[var(--z-primary)]"
              >
                <svg lucideClock class="size-4" aria-hidden="true"></svg>
                <span>{{ formatTimestamp(currentTimestamp()) }}</span>
              </div>
              <z-textarea
                [formControl]="reviewControl"
                [placeholder]="'videos.addCommentPlaceholder' | transloco"
                [autoResize]="true"
                [maxRows]="8"
                [rows]="1"
              />
              <z-button
                type="submit"
                [disabled]="!reviewControl.value.trim() || store.reviewStatus() === 'loading'"
              >
                <svg lucideSendHorizontal class="size-4" aria-hidden="true"></svg>
                <span>{{ 'common.actions.add' | transloco }}</span>
              </z-button>
            </div>
          </form>
        }
      }
    </div>
  `,
})
export class VideoDetailsPageComponent {
  protected readonly store = inject(VideosStore);
  protected readonly session = inject(SessionStore);
  private readonly shell = inject(AppShellStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly dateTime = inject(DashboardDateTimeService);
  private readonly muxPlayer = viewChild<ElementRef<HTMLElement>>('muxPlayer');

  protected readonly currentTimestamp = signal(0);
  protected readonly editingReviewId = signal<string | null>(null);
  protected readonly selectedVideoIndex = signal(0);
  protected readonly reviewControl = new FormControl('', { nonNullable: true });
  protected readonly editReviewControl = new FormControl('', { nonNullable: true });
  protected readonly collapsedThreads = signal<Set<string>>(new Set());
  protected readonly openReplyFor = signal<string | null>(null);
  protected readonly replyControl = new FormControl('', { nonNullable: true });
  private readonly replyTextareaEl = viewChild('replyTextarea', { read: ElementRef });

  protected readonly selectedVideo = computed(() => {
    const videos = this.store.activeAsset()?.videos ?? [];
    return videos[this.selectedVideoIndex()] ?? null;
  });

  protected readonly playbackId = computed(
    () => this.selectedVideo()?.playback_id || this.store.activeAsset()?.playback_id || null,
  );
  protected readonly hasUnreviewedParts = computed(
    () => this.store.activeAsset()?.videos?.some((video) => video.review_count === 0) ?? false,
  );
  protected readonly showCommentBar = computed(
    () => !!this.selectedVideo() && this.canAddReviews() && !this.isFinalized(),
  );

  constructor() {
    afterNextRender(() => {
      if (navigator.userAgent.includes('jsdom') || customElements.get('mux-player')) {
        return;
      }

      void import('@mux/mux-player');
    });

    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const assetId = params.get('id');
      if (assetId) {
        void this.store.loadVideo(assetId);
      }
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const rawIndex = Number(params.get('video') ?? '0');
      this.selectedVideoIndex.set(Number.isFinite(rawIndex) && rawIndex >= 0 ? rawIndex : 0);
      this.currentTimestamp.set(0);
      this.cancelEditing();
    });

    effect((onCleanup) => {
      const player = this.muxPlayer()?.nativeElement;
      if (!player) return;

      const updateTimestamp = () => {
        const currentTime = (player as HTMLMediaElement).currentTime;
        if (Number.isFinite(currentTime)) {
          this.currentTimestamp.set(Math.floor(currentTime));
        }
      };

      player.addEventListener('timeupdate', updateTimestamp);

      onCleanup(() => player.removeEventListener('timeupdate', updateTimestamp));
    });

    effect(() => {
      const video = this.selectedVideo();
      if (video && this.session.hasPermission('reviews:read')) {
        void this.store.loadReviews(video.id);
      }
    });
  }

  protected selectVideoPart(index: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { video: index },
      queryParamsHandling: 'merge',
    });
  }

  protected canAddReviews(): boolean {
    return this.session.hasPermission('reviews:create') && !this.isFinalized();
  }

  protected canEditReviews(): boolean {
    return this.session.hasPermission('reviews:edit') && !this.isFinalized();
  }

  protected canDeleteReviews(): boolean {
    return this.session.hasPermission('reviews:delete') && !this.isFinalized();
  }

  protected canFinalize(): boolean {
    return this.session.hasPermission('assets:finalize') && !this.isFinalized();
  }

  protected isFinalized(): boolean {
    return this.store.activeAsset()?.status === 'completed';
  }

  protected formatTimestamp(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  protected async postReview(event: Event): Promise<void> {
    event.preventDefault();

    const video = this.selectedVideo();
    const content = this.reviewControl.value.trim();
    if (!video || !content || this.isFinalized()) return;

    await this.store.createReview(video.id, content, this.currentTimestamp());
    if (this.store.reviewStatus() === 'success') {
      this.reviewControl.reset('');
    }
  }

  protected startEditing(reviewId: string, content: string): void {
    this.editingReviewId.set(reviewId);
    this.editReviewControl.setValue(content);
  }

  protected cancelEditing(): void {
    this.editingReviewId.set(null);
    this.editReviewControl.reset('');
    this.cancelReply();
  }

  protected async saveEditedReview(event: Event, reviewId: string): Promise<void> {
    event.preventDefault();

    const video = this.selectedVideo();
    const content = this.editReviewControl.value.trim();
    if (!video || !content || this.isFinalized()) return;

    await this.store.updateReview(video.id, reviewId, content);
    if (this.store.reviewStatus() === 'success') {
      this.cancelEditing();
    }
  }

  protected async enhanceEditedReview(): Promise<void> {
    const content = this.editReviewControl.value.trim();
    if (!content || this.store.enhancementStatus() === 'loading') return;

    const enhancedText = await this.store.enhanceReviewText(content);
    if (!enhancedText) {
      this.shell.showToast(
        this.transloco.translate('toast.errorTitle'),
        this.transloco.translate('videos.textEnhanceFailed'),
      );
      return;
    }

    this.editReviewControl.setValue(enhancedText);
    this.shell.showToast(
      this.transloco.translate('toast.successTitle'),
      this.transloco.translate('videos.textEnhanced'),
    );
  }

  protected async doDeleteReview(reviewId: string): Promise<void> {
    const video = this.selectedVideo();
    if (!video || this.isFinalized()) return;
    await this.store.deleteReview(video.id, reviewId);
  }

  protected confirmFinalizeVideo(result: unknown): void {
    if (result !== true) return;

    const asset = this.store.activeAsset();
    if (!asset || this.isFinalized()) return;

    void this.store.finalizeVideo(asset.id);
  }

  protected groupInitials(name: string): string {
    return (
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join('')
        .toUpperCase() || '?'
    );
  }

  protected authorInitials(name?: string): string {
    return this.groupInitials(name ?? '');
  }

  protected seekTo(seconds: number): void {
    const player = this.muxPlayer()?.nativeElement as HTMLMediaElement | undefined;
    if (player) player.currentTime = seconds;
  }

  protected formatAbsolute(dateStr: string): string {
    return this.dateTime.formatInstantDateTime(dateStr, { dateStyle: 'medium', timeStyle: 'short' });
  }

  protected toggleThread(rootId: string): void {
    const next = new Set(this.collapsedThreads());
    if (next.has(rootId)) {
      next.delete(rootId);
    } else {
      next.add(rootId);
    }
    this.collapsedThreads.set(next);
  }

  protected openReply(rootId: string): void {
    const next = new Set(this.collapsedThreads());
    next.delete(rootId);
    this.collapsedThreads.set(next);
    this.openReplyFor.set(rootId);
    this.replyControl.reset('');
    setTimeout(() => {
      const host = this.replyTextareaEl()?.nativeElement as HTMLElement | undefined;
      const ta = host?.querySelector('textarea') ?? host;
      if (ta instanceof HTMLElement) ta.focus();
    });
  }

  protected cancelReply(): void {
    this.openReplyFor.set(null);
    this.replyControl.reset('');
  }

  protected onReplyKeydown(event: KeyboardEvent, rootId: string): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void this.submitReply(rootId);
    }
  }

  protected async submitReply(rootId: string): Promise<void> {
    const video = this.selectedVideo();
    const content = this.replyControl.value.trim();
    if (!video || !content || this.isFinalized()) return;
    await this.store.createReview(video.id, content, undefined, rootId);
    if (this.store.reviewStatus() === 'success') {
      this.cancelReply();
    }
  }

  protected async postReply(event: Event, rootId: string): Promise<void> {
    event.preventDefault();
    await this.submitReply(rootId);
  }
}
