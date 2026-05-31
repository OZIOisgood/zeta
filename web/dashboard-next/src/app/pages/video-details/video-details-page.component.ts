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
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgpDialogTrigger } from 'ng-primitives/dialog';
import {
  LucideCheck,
  LucideClock,
  LucideMessageCircle,
  LucidePencil,
  LucideSendHorizontal,
  LucideTrash,
  LucideVideo,
} from '@lucide/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { SessionStore } from '../../features/session/session.store';
import { VideosStore } from '../../features/videos/videos.store';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZBreadcrumbsComponent } from '../../shared/ui/breadcrumbs/z-breadcrumbs.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZDialogPanelComponent } from '../../shared/ui/dialog/z-dialog-panel.component';
import { ZEmptyStateComponent } from '../../shared/ui/empty-state/z-empty-state.component';
import { ZIconButtonComponent } from '../../shared/ui/icon-button/z-icon-button.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';
import { ZTextareaComponent } from '../../shared/ui/textarea/z-textarea.component';

@Component({
  selector: 'app-video-details-page',
  imports: [
    NgClass,
    ReactiveFormsModule,
    NgpDialogTrigger,
    TranslocoPipe,
    ZBadgeComponent,
    ZBreadcrumbsComponent,
    ZButtonComponent,
    ZDialogPanelComponent,
    ZEmptyStateComponent,
    ZIconButtonComponent,
    ZSkeletonComponent,
    ZTextareaComponent,
    LucideCheck,
    LucideClock,
    LucideMessageCircle,
    LucidePencil,
    LucideSendHorizontal,
    LucideTrash,
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
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <svg
                    lucideMessageCircle
                    class="size-4 text-[var(--z-primary)]"
                    aria-hidden="true"
                  ></svg>
                  <h3 class="text-sm font-semibold">{{ 'videos.comments' | transloco }}</h3>
                </div>
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
                <div class="mt-4 grid gap-3">
                  @for (review of store.reviews(); track review.id) {
                    <article
                      class="rounded-md border border-[var(--z-border)] bg-[var(--z-bg)] p-4"
                    >
                      @if (editingReviewId() === review.id) {
                        <form class="grid gap-3" (submit)="saveEditedReview($event, review.id)">
                          <z-textarea
                            [formControl]="editReviewControl"
                            [placeholder]="'videos.commentPlaceholder' | transloco"
                            [rows]="4"
                          />
                          <div class="flex justify-end gap-2">
                            <z-button
                              type="button"
                              size="sm"
                              variant="secondary"
                              (pressed)="cancelEditing()"
                            >
                              {{ 'common.actions.cancel' | transloco }}
                            </z-button>
                            <z-button
                              type="submit"
                              size="sm"
                              [disabled]="!editReviewControl.value.trim()"
                            >
                              {{ 'common.actions.save' | transloco }}
                            </z-button>
                          </div>
                        </form>
                      } @else {
                        <p class="whitespace-pre-wrap text-sm leading-7">{{ review.content }}</p>
                        <div class="mt-3 flex items-center justify-between gap-3">
                          <div
                            class="flex min-w-0 items-center gap-2 text-xs text-[var(--z-muted)]"
                          >
                            @if (
                              review.timestamp_seconds !== undefined &&
                              review.timestamp_seconds !== null
                            ) {
                              <svg lucideClock class="size-3.5" aria-hidden="true"></svg>
                              <span>{{ formatTimestamp(review.timestamp_seconds) }}</span>
                            }
                          </div>
                          @if (canEditReviews() || canDeleteReviews()) {
                            <div class="flex items-center gap-1">
                              @if (canEditReviews()) {
                                <z-icon-button
                                  [label]="'common.actions.edit' | transloco"
                                  size="sm"
                                  (pressed)="startEditing(review.id, review.content)"
                                >
                                  <svg lucidePencil class="size-4" aria-hidden="true"></svg>
                                </z-icon-button>
                              }
                              @if (canDeleteReviews()) {
                                <ng-template #deleteCommentDialog let-close="close">
                                  <z-dialog-panel
                                    [title]="'videos.deleteComment' | transloco"
                                    [description]="'videos.confirmDeleteComment' | transloco"
                                    tone="danger"
                                    [confirmLabel]="'common.actions.delete' | transloco"
                                    [cancelLabel]="'common.actions.cancel' | transloco"
                                    [close]="close"
                                  />
                                </ng-template>
                                <z-icon-button
                                  [label]="'common.actions.delete' | transloco"
                                  size="sm"
                                  [ngpDialogTrigger]="deleteCommentDialog"
                                  (ngpDialogTriggerClosed)="confirmDeleteReview($event, review.id)"
                                >
                                  <svg lucideTrash class="size-4" aria-hidden="true"></svg>
                                </z-icon-button>
                              }
                            </div>
                          }
                        </div>
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
                    <p class="mt-1 text-sm font-semibold text-[var(--z-primary)]">
                      {{ asset.group.name }}
                    </p>
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
          <form
            class="sticky bottom-0 z-20 rounded-lg border border-[var(--z-border)] bg-white p-3 shadow-lg"
            (submit)="postReview($event)"
          >
            <div class="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-end">
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly muxPlayer = viewChild<ElementRef<HTMLElement>>('muxPlayer');

  protected readonly currentTimestamp = signal(0);
  protected readonly editingReviewId = signal<string | null>(null);
  protected readonly selectedVideoIndex = signal(0);
  protected readonly reviewControl = new FormControl('', { nonNullable: true });
  protected readonly editReviewControl = new FormControl('', { nonNullable: true });

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

  protected async confirmDeleteReview(result: unknown, reviewId: string): Promise<void> {
    if (result !== true) return;

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
}
