import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LucideArrowLeft,
  LucideLink,
  LucideQrCode,
  LucideSettings,
  LucideUsers,
} from '@lucide/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { GroupsStore } from '../../features/groups/groups.store';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZEmptyStateComponent } from '../../shared/ui/empty-state/z-empty-state.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';

@Component({
  selector: 'app-group-details-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    ZBadgeComponent,
    ZEmptyStateComponent,
    ZSkeletonComponent,
    LucideArrowLeft,
    LucideLink,
    LucideQrCode,
    LucideSettings,
    LucideUsers,
  ],
  template: `
    <div class="grid gap-6">
      <a
        routerLink="/groups"
        class="inline-flex items-center gap-2 text-sm font-semibold text-[var(--z-muted)] hover:text-[var(--z-text)]"
      >
        <svg lucideArrowLeft class="size-4" aria-hidden="true"></svg>
        <span>{{ 'common.actions.back' | transloco }}</span>
      </a>

      @if (store.detailStatus() === 'loading') {
        <z-skeleton class="block h-56 w-full"></z-skeleton>
      } @else if (store.detailStatus() === 'error') {
        <z-empty-state
          [title]="'groups.phase4.detailFailed' | transloco"
          [description]="store.detailError() || ('home.error.description' | transloco)"
        />
      } @else if (store.activeGroup(); as group) {
        <section class="rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm">
          <div class="grid gap-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-start">
            <span
              class="grid size-16 place-items-center overflow-hidden rounded-lg bg-[var(--z-surface-warm)] text-[var(--z-primary)]"
            >
              @if (group.avatar) {
                <img class="size-full object-cover" [src]="avatarSrc(group.avatar)" alt="" />
              } @else {
                <svg lucideUsers class="size-8" aria-hidden="true"></svg>
              }
            </span>
            <div class="min-w-0">
              <z-badge tone="primary">{{ 'groups.myGroups' | transloco }}</z-badge>
              <h2 class="mt-3 text-2xl font-semibold sm:text-3xl">{{ group.name }}</h2>
              <p class="mt-3 max-w-3xl text-sm leading-6 text-[var(--z-muted)]">
                {{ group.description || ('groups.phase4.noDescription' | transloco) }}
              </p>
            </div>
            <a
              class="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--z-border)] bg-white px-3 text-sm font-semibold transition hover:bg-[var(--z-surface-warm)]"
              [routerLink]="['/groups', group.id, 'preferences', 'general']"
            >
              <svg lucideSettings class="size-4" aria-hidden="true"></svg>
              <span>{{ 'groups.preferences' | transloco }}</span>
            </a>
          </div>
        </section>

        <section class="grid gap-4 lg:grid-cols-2">
          <article class="rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm">
            <div class="flex items-center gap-3">
              <span
                class="grid size-10 place-items-center rounded-md bg-[var(--z-surface-warm)] text-[var(--z-primary)]"
              >
                <svg lucideUsers class="size-5" aria-hidden="true"></svg>
              </span>
              <div>
                <h3 class="text-base font-semibold">{{ 'groups.students' | transloco }}</h3>
                <p class="mt-1 text-sm text-[var(--z-muted)]">
                  {{ 'groups.phase4.membersPlaceholder' | transloco }}
                </p>
              </div>
            </div>
          </article>

          <article class="rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm">
            <div class="flex items-center gap-3">
              <span
                class="grid size-10 place-items-center rounded-md bg-[var(--z-surface-warm)] text-[var(--z-primary)]"
              >
                <svg lucideLink class="size-5" aria-hidden="true"></svg>
              </span>
              <div>
                <h3 class="text-base font-semibold">
                  {{ 'groups.createInvitationTitle' | transloco }}
                </h3>
                <p class="mt-1 text-sm text-[var(--z-muted)]">
                  {{ 'groups.phase4.invitePlaceholder' | transloco }}
                </p>
              </div>
            </div>
            <div
              class="mt-4 grid aspect-[3/2] place-items-center rounded-md border border-dashed border-[var(--z-border)] bg-[var(--z-surface-warm)] text-[var(--z-primary)]"
            >
              <svg lucideQrCode class="size-10" aria-hidden="true"></svg>
            </div>
          </article>
        </section>
      }
    </div>
  `,
})
export class GroupDetailsPageComponent {
  protected readonly store = inject(GroupsStore);

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const groupId = params.get('id');
        if (groupId) {
          void this.store.loadGroup(groupId);
        }
      });
  }

  protected avatarSrc(avatar: string): string {
    return avatar.startsWith('data:') ? avatar : `data:image/jpeg;base64,${avatar}`;
  }
}
