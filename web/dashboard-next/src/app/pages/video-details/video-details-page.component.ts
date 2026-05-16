import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideArrowLeft, LucideMessageCircle, LucideVideo } from '@lucide/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { VideosStore } from '../../features/videos/videos.store';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZEmptyStateComponent } from '../../shared/ui/empty-state/z-empty-state.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';

@Component({
  selector: 'app-video-details-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    ZBadgeComponent,
    ZEmptyStateComponent,
    ZSkeletonComponent,
    LucideArrowLeft,
    LucideMessageCircle,
    LucideVideo,
  ],
  template: `
    <div class="grid gap-6">
      <a
        routerLink="/videos"
        class="inline-flex items-center gap-2 text-sm font-semibold text-[var(--z-muted)] hover:text-[var(--z-text)]"
      >
        <svg lucideArrowLeft class="size-4" aria-hidden="true"></svg>
        <span>{{ 'common.actions.back' | transloco }}</span>
      </a>

      @if (store.detailStatus() === 'loading') {
        <section class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]" aria-hidden="true">
          <z-skeleton class="block aspect-video w-full"></z-skeleton>
          <z-skeleton class="block h-64 w-full"></z-skeleton>
        </section>
      } @else if (store.detailStatus() === 'error') {
        <z-empty-state
          [title]="'videos.phase4.detailFailed' | transloco"
          [description]="store.detailError() || ('home.error.description' | transloco)"
        />
      } @else if (store.activeAsset(); as asset) {
        <section class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div class="grid gap-4">
            <div
              class="overflow-hidden rounded-lg border border-[var(--z-border)] bg-black shadow-sm"
            >
              @if (asset.playback_id) {
                <div class="grid aspect-video place-items-center bg-black text-white">
                  <div class="text-center">
                    <svg lucideVideo class="mx-auto size-10" aria-hidden="true"></svg>
                    <p class="mt-3 text-sm font-semibold">
                      {{ 'videos.phase4.playerReady' | transloco }}
                    </p>
                    <p class="mt-1 text-xs text-white/70">{{ asset.playback_id }}</p>
                  </div>
                </div>
              } @else {
                <div
                  class="grid aspect-video place-items-center bg-[var(--z-surface-warm)] text-[var(--z-primary)]"
                >
                  <svg lucideVideo class="size-12" aria-hidden="true"></svg>
                </div>
              }
            </div>

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
                  <h2 class="mt-3 text-2xl font-semibold">{{ asset.title }}</h2>
                  @if (asset.group) {
                    <p class="mt-1 text-sm font-semibold text-[var(--z-primary)]">
                      {{ asset.group.name }}
                    </p>
                  }
                </div>
                <z-badge>{{ 'videos.comments' | transloco }}: {{ asset.review_count }}</z-badge>
              </div>
              <p class="mt-4 text-sm leading-6 text-[var(--z-muted)]">
                {{ asset.description || ('videos.phase4.noDescription' | transloco) }}
              </p>
            </section>
          </div>

          <aside class="grid gap-4 content-start">
            <section class="rounded-lg border border-[var(--z-border)] bg-white p-4 shadow-sm">
              <h3 class="text-sm font-semibold">{{ 'videos.phase4.videoParts' | transloco }}</h3>
              <div class="mt-4 grid gap-2">
                @for (video of asset.videos ?? []; track video.id; let index = $index) {
                  <div
                    class="flex items-center justify-between gap-3 rounded-md border border-[var(--z-border)] p-3"
                  >
                    <div class="min-w-0">
                      <p class="truncate text-sm font-semibold">
                        {{ 'videos.phase4.videoPart' | transloco: { count: index + 1 } }}
                      </p>
                      <p class="mt-1 text-xs text-[var(--z-muted)]">{{ video.status }}</p>
                    </div>
                    <z-badge>{{ video.review_count }}</z-badge>
                  </div>
                } @empty {
                  <p class="text-sm leading-6 text-[var(--z-muted)]">
                    {{ 'videos.phase4.noVideoParts' | transloco }}
                  </p>
                }
              </div>
            </section>

            <section class="rounded-lg border border-[var(--z-border)] bg-white p-4 shadow-sm">
              <div class="flex items-center gap-2">
                <svg
                  lucideMessageCircle
                  class="size-4 text-[var(--z-primary)]"
                  aria-hidden="true"
                ></svg>
                <h3 class="text-sm font-semibold">{{ 'videos.comments' | transloco }}</h3>
              </div>
              <p class="mt-3 text-sm leading-6 text-[var(--z-muted)]">
                {{ 'videos.phase4.reviewPlaceholder' | transloco }}
              </p>
            </section>
          </aside>
        </section>
      }
    </div>
  `,
})
export class VideoDetailsPageComponent {
  protected readonly store = inject(VideosStore);

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const assetId = params.get('id');
        if (assetId) {
          void this.store.loadVideo(assetId);
        }
      });
  }
}
