import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucidePlus, LucideRotateCcw, LucideVideo } from '@lucide/angular';
import { Asset } from '../../core/http/assets-api.service';
import { VideosStore } from '../../features/videos/videos.store';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZEmptyStateComponent } from '../../shared/ui/empty-state/z-empty-state.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';
import { ZTabPanelComponent } from '../../shared/ui/tabs/z-tab-panel.component';
import { ZTabsComponent } from '../../shared/ui/tabs/z-tabs.component';

type VideoFilter = 'all' | 'toReview' | 'reviewed';

@Component({
  selector: 'app-videos-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    ZBadgeComponent,
    ZButtonComponent,
    ZEmptyStateComponent,
    ZSkeletonComponent,
    ZTabPanelComponent,
    ZTabsComponent,
    LucidePlus,
    LucideRotateCcw,
    LucideVideo,
  ],
  template: `
    <div class="grid gap-6">
      <section
        class="grid gap-4 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
      >
        <div>
          <h2 class="text-2xl font-semibold sm:text-3xl">
            {{ 'videos.allMyVideos' | transloco }}
          </h2>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-[var(--z-muted)]">
            {{ 'videos.phase4.summary' | transloco }}
          </p>
        </div>
        <a
          routerLink="/upload-video"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--z-primary)] bg-[var(--z-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--z-primary-strong)]"
        >
          <svg lucidePlus class="size-4" aria-hidden="true"></svg>
          <span>{{ 'videos.uploadNew' | transloco }}</span>
        </a>
      </section>

      <z-tabs
        tabsId="videos-tabs"
        [label]="'videos.filtersLabel' | transloco"
        [value]="selectedFilter()"
        [options]="filterOptions()"
        (valueChange)="setFilter($event)"
      />

      <z-tab-panel tabsId="videos-tabs" [value]="selectedFilter()">
        @if (store.status() === 'loading') {
          <section class="grid gap-3" aria-hidden="true">
            @for (_ of [1, 2, 3]; track _) {
              <z-skeleton class="block h-24 w-full"></z-skeleton>
            }
          </section>
        } @else if (store.status() === 'error') {
          <section class="rounded-lg border border-rose-200 bg-rose-50 p-5">
            <z-badge tone="danger">{{ 'home.error.badge' | transloco }}</z-badge>
            <h2 class="mt-3 text-base font-semibold">{{ 'videos.phase4.loadFailed' | transloco }}</h2>
            <p class="mt-1 text-sm text-rose-800">{{ store.error() }}</p>
            <div class="mt-4">
              <z-button variant="secondary" size="sm" (pressed)="store.loadVideos()">
                <svg lucideRotateCcw class="size-4" aria-hidden="true"></svg>
                <span>{{ 'common.actions.retry' | transloco }}</span>
              </z-button>
            </div>
          </section>
        } @else if (filteredAssets().length === 0) {
          <z-empty-state
            [title]="emptyTitleKey() | transloco"
            [description]="emptyDescriptionKey() | transloco"
          >
            <a
              routerLink="/upload-video"
              class="inline-flex min-h-9 items-center justify-center rounded-md border border-[var(--z-border)] bg-white px-3 text-sm font-semibold transition hover:bg-[var(--z-surface-warm)]"
            >
              {{ 'videos.uploadFirst' | transloco }}
            </a>
          </z-empty-state>
        } @else {
          <section class="grid gap-3">
            @for (asset of filteredAssets(); track asset.id) {
              <a
                class="grid gap-4 rounded-lg border border-[var(--z-border)] bg-white p-4 shadow-sm transition hover:border-[var(--z-primary-soft)] hover:bg-[var(--z-surface-warm)] sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-center"
                [routerLink]="['/asset', asset.id]"
                animate.enter="z-list-enter"
              >
                <span
                  class="flex aspect-video items-center justify-center overflow-hidden rounded-md bg-[var(--z-surface-warm)] text-[var(--z-primary)]"
                  [style.background-image]="asset.thumbnail ? 'url(' + asset.thumbnail + ')' : null"
                  [class.bg-cover]="asset.thumbnail"
                  [class.bg-center]="asset.thumbnail"
                >
                  @if (!asset.thumbnail) {
                    <svg lucideVideo class="size-6" aria-hidden="true"></svg>
                  }
                </span>
                <span class="min-w-0">
                  <span class="block truncate text-base font-semibold">{{ asset.title }}</span>
                  <span class="mt-1 block truncate text-sm text-[var(--z-muted)]">
                    {{
                      asset.description || asset.group?.name || ('videos.noVideosHere' | transloco)
                    }}
                  </span>
                  @if (asset.group) {
                    <span class="mt-2 block text-xs font-semibold text-[var(--z-primary)]">
                      {{ asset.group.name }}
                    </span>
                  }
                </span>
                <span class="flex flex-wrap gap-2 sm:justify-end">
                  <z-badge [tone]="asset.status === 'completed' ? 'success' : 'primary'">
                    {{ statusLabel(asset) | transloco }}
                  </z-badge>
                  <z-badge>{{ 'videos.comments' | transloco }}: {{ asset.review_count }}</z-badge>
                </span>
              </a>
            }
          </section>
        }
      </z-tab-panel>
    </div>
  `,
})
export class VideosPageComponent {
  protected readonly store = inject(VideosStore);
  private readonly transloco = inject(TranslocoService);
  private readonly _translationEvents = toSignal(this.transloco.events$, { initialValue: null });
  protected readonly selectedFilter = signal<VideoFilter>('all');
  protected readonly filters: { value: VideoFilter; labelKey: string }[] = [
    { value: 'all', labelKey: 'videos.all' },
    { value: 'toReview', labelKey: 'videos.reviewStatus.toReview' },
    { value: 'reviewed', labelKey: 'videos.reviewStatus.reviewed' },
  ];
  protected readonly filteredAssets = computed(() => {
    const filter = this.selectedFilter();
    const assets = this.store.assets();

    if (filter === 'reviewed') {
      return assets.filter((asset) => asset.status === 'completed');
    }

    if (filter === 'toReview') {
      return assets.filter((asset) => asset.status !== 'completed');
    }

    return assets;
  });
  protected readonly filterOptions = computed(() => {
    this._translationEvents();

    return this.filters.map((filter) => ({
      value: filter.value,
      label: this.transloco.translate(filter.labelKey),
      badge: this.countFor(filter.value),
    }));
  });

  constructor() {
    if (this.store.status() === 'idle') {
      void this.store.loadVideos();
    }
  }

  protected countFor(filter: VideoFilter): number {
    if (filter === 'reviewed') {
      return this.store.reviewedCount();
    }

    if (filter === 'toReview') {
      return this.store.toReviewCount();
    }

    return this.store.videoCount();
  }

  protected setFilter(filter: string): void {
    if (filter === 'all' || filter === 'toReview' || filter === 'reviewed') {
      this.selectedFilter.set(filter);
    }
  }

  protected emptyTitleKey(): string {
    return this.store.assets().length === 0 ? 'videos.noVideosYet' : 'videos.noVideosMatch';
  }

  protected emptyDescriptionKey(): string {
    return this.store.assets().length === 0
      ? 'videos.uploadFirstDescription'
      : 'videos.noVideosForStatuses';
  }

  protected statusLabel(asset: Asset): string {
    return asset.status === 'completed' ? 'common.status.reviewed' : 'common.status.inReview';
  }
}
