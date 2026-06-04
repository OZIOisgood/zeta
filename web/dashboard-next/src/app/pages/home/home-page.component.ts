import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideCalendarDays,
  LucideCheckCircle2,
  LucideCircle,
  LucideUsers,
  LucideVideo,
} from '@lucide/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { GroupsStore } from '../../features/groups/groups.store';
import { SessionsOverviewStore } from '../../features/sessions/sessions-overview.store';
import { VideosStore } from '../../features/videos/videos.store';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZEmptyStateComponent } from '../../shared/ui/empty-state/z-empty-state.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';
import { ZVideoPreviewComponent } from '../../shared/ui/video-preview/z-video-preview.component';

type HomeStep = {
  completed: boolean;
  descriptionKey: string;
  href: string;
  labelKey: string;
};

@Component({
  selector: 'app-home-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    ZBadgeComponent,
    ZEmptyStateComponent,
    ZSkeletonComponent,
    ZVideoPreviewComponent,
    LucideCalendarDays,
    LucideCheckCircle2,
    LucideCircle,
    LucideUsers,
    LucideVideo,
  ],
  template: `
    <div class="grid gap-6" [class.lg:grid-cols-[minmax(0,1fr)_22rem]]="showFirstSteps()">
      <div class="flex min-w-0 flex-col gap-6">
        <section class="grid gap-3 sm:grid-cols-3" aria-label="Dashboard overview">
          <a
            routerLink="/videos"
            class="rounded-lg border border-[var(--z-border)] bg-white p-4 shadow-sm transition hover:border-[var(--z-primary-soft)] hover:bg-[var(--z-surface-warm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)]"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-medium text-[var(--z-muted)]">
                {{ 'videos.title' | transloco }}
              </p>
              <svg lucideVideo class="size-4 text-[var(--z-primary)]" aria-hidden="true"></svg>
            </div>
            <p class="mt-4 text-3xl font-semibold">{{ videos.videoCount() }}</p>
          </a>
          <a
            routerLink="/groups"
            class="rounded-lg border border-[var(--z-border)] bg-white p-4 shadow-sm transition hover:border-[var(--z-primary-soft)] hover:bg-[var(--z-surface-warm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)]"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-medium text-[var(--z-muted)]">
                {{ 'groups.myGroups' | transloco }}
              </p>
              <svg lucideUsers class="size-4 text-[var(--z-primary)]" aria-hidden="true"></svg>
            </div>
            <p class="mt-4 text-3xl font-semibold">{{ groups.groupCount() }}</p>
          </a>
          <a
            routerLink="/sessions/upcoming"
            class="rounded-lg border border-[var(--z-border)] bg-white p-4 shadow-sm transition hover:border-[var(--z-primary-soft)] hover:bg-[var(--z-surface-warm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)]"
          >
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
          </a>
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
                @if (canUploadVideo()) {
                  <a
                    routerLink="/upload-video"
                    class="inline-flex min-h-9 items-center justify-center rounded-md border border-[var(--z-primary)] bg-[var(--z-primary)] px-3 text-sm font-semibold text-white transition hover:bg-[var(--z-primary-strong)]"
                  >
                    {{ 'videos.uploadNew' | transloco }}
                  </a>
                }
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
                  <z-video-preview
                    class="size-14 shrink-0 rounded-md"
                    [thumbnail]="asset.thumbnail"
                  />
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

      @if (showFirstSteps()) {
        <aside class="flex flex-col gap-4">
          <section class="rounded-lg border border-[var(--z-border)] bg-white p-4 shadow-sm">
            <h2 class="text-sm font-semibold">{{ 'home.firstSteps.title' | transloco }}</h2>
            <div class="mt-4 grid gap-3">
              @for (step of steps(); track step.labelKey) {
                <a
                  class="flex items-start gap-3 rounded-md border border-[var(--z-border)] bg-white p-3 transition hover:bg-[var(--z-surface-warm)]"
                  [class.opacity-60]="step.completed"
                  [routerLink]="step.href"
                >
                  <span class="mt-0.5 text-[var(--z-primary)]">
                    @if (step.completed) {
                      <svg lucideCheckCircle2 class="size-4" aria-hidden="true"></svg>
                    } @else {
                      <svg lucideCircle class="size-4" aria-hidden="true"></svg>
                    }
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
      }
    </div>
  `,
})
export class HomePageComponent {
  protected readonly videos = inject(VideosStore);
  protected readonly groups = inject(GroupsStore);
  protected readonly sessions = inject(SessionsOverviewStore);
  private readonly permissions = inject(PermissionsService);
  protected readonly canUploadVideo = () => this.permissions.hasPermission('assets:create');
  protected readonly steps = computed<HomeStep[]>(() => {
    const hasGroups = this.groups.hasGroups();
    const hasVideos = this.videos.videoCount() > 0;
    const hasReviewedVideos = this.videos.reviewedCount() > 0;
    const steps: HomeStep[] = [];

    if (this.permissions.hasPermission('groups:read')) {
      steps.push({
        completed: hasGroups,
        labelKey: hasGroups ? 'home.firstSteps.groupCreated' : 'home.firstSteps.createGroup',
        descriptionKey: hasGroups
          ? 'home.firstSteps.groupCreatedDescription'
          : 'home.firstSteps.createGroupDescription',
        href:
          hasGroups && this.groups.firstGroup()
            ? `/groups/${this.groups.firstGroup()?.id}`
            : this.permissions.hasPermission('groups:create')
              ? '/create-group'
              : '/groups',
      });
    }

    if (this.permissions.hasPermission('assets:create')) {
      steps.push({
        completed: hasVideos,
        labelKey: hasVideos ? 'home.firstSteps.videoUploaded' : 'home.firstSteps.uploadFirstVideo',
        descriptionKey: hasVideos
          ? 'home.firstSteps.videoUploadedDescription'
          : 'home.firstSteps.uploadFirstVideoDescription',
        href: hasVideos ? '/videos' : '/upload-video',
      });
    }

    if (this.permissions.hasPermission('reviews:read')) {
      steps.push({
        completed: hasReviewedVideos,
        labelKey: 'home.firstSteps.reviewVideos',
        descriptionKey: 'home.firstSteps.reviewVideosDescription',
        href: '/videos',
      });
    }

    if (this.permissions.hasPermission('coaching:book')) {
      steps.push({
        completed: this.sessions.upcomingBookings().length > 0,
        labelKey:
          this.sessions.upcomingBookings().length > 0
            ? 'home.firstSteps.coachingBooked'
            : 'home.firstSteps.bookLiveCoaching',
        descriptionKey:
          this.sessions.upcomingBookings().length > 0
            ? 'home.firstSteps.coachingBookedDescription'
            : 'home.firstSteps.bookLiveCoachingDescription',
        href: '/sessions/book',
      });
    }

    if (this.permissions.hasPermission('coaching:availability:manage')) {
      steps.push({
        completed: false,
        labelKey: 'home.firstSteps.setAvailability',
        descriptionKey: 'home.firstSteps.setAvailabilityDescription',
        href: '/sessions/settings',
      });
    }

    return steps;
  });
  protected readonly showFirstSteps = computed(() => {
    const loaded = this.groups.status() === 'success' && this.videos.status() === 'success';
    return loaded && this.steps().some((step) => !step.completed);
  });

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
