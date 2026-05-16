import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideCalendarDays,
  LucideCheckCircle2,
  LucideUpload,
  LucideUsers,
  LucideVideo,
} from '@lucide/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { GroupsStore } from '../../features/groups/groups.store';
import { SessionsOverviewStore } from '../../features/sessions/sessions-overview.store';
import { VideosStore } from '../../features/videos/videos.store';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZEmptyStateComponent } from '../../shared/ui/empty-state/z-empty-state.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';

@Component({
  selector: 'app-home-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    ZBadgeComponent,
    ZEmptyStateComponent,
    ZSkeletonComponent,
    LucideArrowRight,
    LucideCalendarDays,
    LucideCheckCircle2,
    LucideUpload,
    LucideUsers,
    LucideVideo,
  ],
  template: `
    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div class="flex min-w-0 flex-col gap-6">
        <section class="rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm">
          <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <div>
              <h2 class="max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
                {{ 'home.title' | transloco }}
              </h2>
              <p class="mt-3 max-w-2xl text-sm leading-6 text-[var(--z-muted)] sm:text-base">
                {{ 'home.summary' | transloco }}
              </p>
            </div>

            <a
              routerLink="/upload-video"
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--z-primary)] bg-[var(--z-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--z-primary-strong)]"
            >
              <span>{{ 'home.primaryAction' | transloco }}</span>
              <svg lucideArrowRight class="size-4" aria-hidden="true"></svg>
            </a>
          </div>
        </section>

        <section class="grid gap-3 sm:grid-cols-3" aria-label="Dashboard overview">
          <article class="rounded-lg border border-[var(--z-border)] bg-white p-4 shadow-sm">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-medium text-[var(--z-muted)]">
                {{ 'videos.title' | transloco }}
              </p>
              <svg lucideVideo class="size-4 text-[var(--z-primary)]" aria-hidden="true"></svg>
            </div>
            <p class="mt-4 text-3xl font-semibold">{{ videos.videoCount() }}</p>
          </article>
          <article class="rounded-lg border border-[var(--z-border)] bg-white p-4 shadow-sm">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-medium text-[var(--z-muted)]">
                {{ 'groups.myGroups' | transloco }}
              </p>
              <svg lucideUsers class="size-4 text-[var(--z-primary)]" aria-hidden="true"></svg>
            </div>
            <p class="mt-4 text-3xl font-semibold">{{ groups.groupCount() }}</p>
          </article>
          <article class="rounded-lg border border-[var(--z-border)] bg-white p-4 shadow-sm">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-medium text-[var(--z-muted)]">
                {{ 'home.upcomingCoachingSessions' | transloco }}
              </p>
              <svg
                lucideCalendarDays
                class="size-4 text-[var(--z-primary)]"
                aria-hidden="true"
              ></svg>
            </div>
            <p class="mt-4 text-3xl font-semibold">{{ sessions.upcomingBookings().length }}</p>
          </article>
        </section>

        <section class="rounded-lg border border-[var(--z-border)] bg-white shadow-sm">
          <div
            class="flex items-center justify-between gap-3 border-b border-[var(--z-border)] p-4"
          >
            <div>
              <h2 class="text-base font-semibold">{{ 'home.latestVideos' | transloco }}</h2>
              <p class="mt-1 text-sm text-[var(--z-muted)]">
                {{ 'home.firstSteps.videoUploadedDescription' | transloco }}
              </p>
            </div>
            <a routerLink="/videos" class="text-sm font-semibold text-[var(--z-primary)]">
              {{ 'common.actions.viewAll' | transloco }}
            </a>
          </div>

          @if (videos.status() === 'loading') {
            <div class="space-y-3 p-4" aria-hidden="true">
              <z-skeleton class="block h-14 w-full"></z-skeleton>
              <z-skeleton class="block h-14 w-full"></z-skeleton>
            </div>
          } @else if (videos.recentVideos().length === 0) {
            <div class="p-4">
              <z-empty-state
                [title]="'videos.noVideosYet' | transloco"
                [description]="'videos.uploadFirstDescription' | transloco"
              >
                <a
                  routerLink="/upload-video"
                  class="inline-flex min-h-9 items-center justify-center rounded-md border border-[var(--z-primary)] bg-[var(--z-primary)] px-3 text-sm font-semibold text-white transition hover:bg-[var(--z-primary-strong)]"
                >
                  {{ 'videos.uploadNew' | transloco }}
                </a>
              </z-empty-state>
            </div>
          } @else {
            <div class="divide-y divide-[var(--z-border)]">
              @for (asset of videos.recentVideos(); track asset.id) {
                <a
                  class="grid gap-3 p-4 transition hover:bg-[var(--z-surface-warm)] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
                  [routerLink]="['/asset', asset.id]"
                  animate.enter="z-list-enter"
                >
                  <span
                    class="grid size-10 place-items-center rounded-md bg-[var(--z-surface-warm)] text-[var(--z-primary)]"
                  >
                    <svg lucideVideo class="size-5" aria-hidden="true"></svg>
                  </span>
                  <span class="min-w-0">
                    <span class="block truncate text-sm font-semibold">{{ asset.title }}</span>
                    <span class="mt-1 block truncate text-sm text-[var(--z-muted)]">{{
                      asset.group?.name || asset.description
                    }}</span>
                  </span>
                  <z-badge [tone]="asset.status === 'completed' ? 'success' : 'primary'">
                    {{
                      asset.status === 'completed'
                        ? ('common.status.reviewed' | transloco)
                        : ('common.status.inReview' | transloco)
                    }}
                  </z-badge>
                </a>
              }
            </div>
          }
        </section>
      </div>

      <aside class="flex flex-col gap-4">
        <section class="rounded-lg border border-[var(--z-border)] bg-[var(--z-surface-warm)] p-4">
          <div class="flex items-center gap-3">
            <span
              class="grid size-10 place-items-center rounded-md bg-white text-[var(--z-primary)]"
            >
              <svg lucideUpload class="size-5" aria-hidden="true"></svg>
            </span>
            <div>
              <h2 class="text-sm font-semibold">{{ 'home.upload.title' | transloco }}</h2>
              <p class="mt-1 text-sm leading-5 text-[var(--z-muted)]">
                {{ 'home.upload.summary' | transloco }}
              </p>
            </div>
          </div>
        </section>

        <section class="rounded-lg border border-[var(--z-border)] bg-white p-4 shadow-sm">
          <h2 class="text-sm font-semibold">{{ 'home.firstSteps.title' | transloco }}</h2>
          <div class="mt-4 grid gap-3">
            @for (step of steps; track step.labelKey) {
              <a
                class="flex items-start gap-3 rounded-md border border-[var(--z-border)] bg-white p-3 transition hover:bg-[var(--z-surface-warm)]"
                [routerLink]="step.href"
              >
                <span class="mt-0.5 text-[var(--z-primary)]">
                  <svg lucideCheckCircle2 class="size-4" aria-hidden="true"></svg>
                </span>
                <span>
                  <span class="block text-sm font-semibold">{{ step.labelKey | transloco }}</span>
                  <span class="mt-1 block text-xs leading-5 text-[var(--z-muted)]">{{
                    step.descriptionKey | transloco
                  }}</span>
                </span>
              </a>
            }
          </div>
        </section>
      </aside>
    </div>
  `,
})
export class HomePageComponent {
  protected readonly videos = inject(VideosStore);
  protected readonly groups = inject(GroupsStore);
  protected readonly sessions = inject(SessionsOverviewStore);
  protected readonly steps = [
    {
      labelKey: 'home.firstSteps.createGroup',
      descriptionKey: 'home.firstSteps.createGroupDescription',
      href: '/create-group',
    },
    {
      labelKey: 'home.firstSteps.uploadFirstVideo',
      descriptionKey: 'home.firstSteps.uploadFirstVideoDescription',
      href: '/upload-video',
    },
    {
      labelKey: 'home.firstSteps.reviewVideos',
      descriptionKey: 'home.firstSteps.reviewVideosDescription',
      href: '/videos',
    },
  ];

  constructor() {
    if (this.videos.status() === 'idle') {
      void this.videos.loadVideos();
    }
    if (this.groups.status() === 'idle') {
      void this.groups.loadGroups();
    }
    if (this.sessions.status() === 'idle') {
      void this.sessions.loadBookings();
    }
  }
}
