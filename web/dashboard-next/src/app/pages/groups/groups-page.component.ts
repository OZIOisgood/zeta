import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucidePlus, LucideRotateCcw, LucideUsers } from '@lucide/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { GroupsStore } from '../../features/groups/groups.store';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZEmptyStateComponent } from '../../shared/ui/empty-state/z-empty-state.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';

@Component({
  selector: 'app-groups-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    ZBadgeComponent,
    ZButtonComponent,
    ZEmptyStateComponent,
    ZSkeletonComponent,
    LucidePlus,
    LucideRotateCcw,
    LucideUsers,
  ],
  template: `
    <div class="grid gap-6">
      <section
        class="grid gap-4 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
      >
        <div>
          <h2 class="text-2xl font-semibold sm:text-3xl">
            {{ 'groups.myGroups' | transloco }}
          </h2>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-[var(--z-muted)]">
            {{ 'groups.phase4.summary' | transloco }}
          </p>
        </div>
        <a
          routerLink="/create-group"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--z-primary)] bg-[var(--z-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--z-primary-strong)]"
        >
          <svg lucidePlus class="size-4" aria-hidden="true"></svg>
          <span>{{ 'groups.createNew' | transloco }}</span>
        </a>
      </section>

      @if (store.status() === 'loading') {
        <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
          @for (_ of [1, 2, 3]; track _) {
            <z-skeleton class="block h-40 w-full"></z-skeleton>
          }
        </section>
      } @else if (store.status() === 'error') {
        <section class="rounded-lg border border-rose-200 bg-rose-50 p-5">
          <z-badge tone="danger">{{ 'home.error.badge' | transloco }}</z-badge>
          <h2 class="mt-3 text-base font-semibold">{{ 'groups.phase4.loadFailed' | transloco }}</h2>
          <p class="mt-1 text-sm text-rose-800">{{ store.error() }}</p>
          <div class="mt-4">
            <z-button variant="secondary" size="sm" (pressed)="store.loadGroups()">
              <svg lucideRotateCcw class="size-4" aria-hidden="true"></svg>
              <span>{{ 'common.actions.retry' | transloco }}</span>
            </z-button>
          </div>
        </section>
      } @else if (!store.hasGroups()) {
        <z-empty-state
          [title]="'groups.noGroupsYet' | transloco"
          [description]="'groups.createFirstDescription' | transloco"
        >
          <a
            routerLink="/create-group"
            class="inline-flex min-h-9 items-center justify-center rounded-md border border-[var(--z-border)] bg-white px-3 text-sm font-semibold transition hover:bg-[var(--z-surface-warm)]"
          >
            {{ 'groups.createFirst' | transloco }}
          </a>
        </z-empty-state>
      } @else {
        <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          @for (group of store.groups(); track group.id) {
            <a
              class="rounded-lg border border-[var(--z-border)] bg-white p-4 shadow-sm transition hover:border-[var(--z-primary-soft)] hover:bg-[var(--z-surface-warm)]"
              [routerLink]="['/groups', group.id]"
              animate.enter="z-list-enter"
            >
              <div class="flex items-start gap-3">
                <span
                  class="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-[var(--z-surface-warm)] text-[var(--z-primary)]"
                >
                  @if (group.avatar) {
                    <img class="size-full object-cover" [src]="avatarSrc(group.avatar)" alt="" />
                  } @else {
                    <svg lucideUsers class="size-6" aria-hidden="true"></svg>
                  }
                </span>
                <span class="min-w-0">
                  <span class="block truncate text-base font-semibold">{{ group.name }}</span>
                  <span class="mt-1 line-clamp-3 block text-sm leading-5 text-[var(--z-muted)]">
                    {{ group.description || ('groups.phase4.noDescription' | transloco) }}
                  </span>
                </span>
              </div>
            </a>
          }
        </section>
      }
    </div>
  `,
})
export class GroupsPageComponent {
  protected readonly store = inject(GroupsStore);

  constructor() {
    if (this.store.status() === 'idle') {
      void this.store.loadGroups();
    }
  }

  protected avatarSrc(avatar: string): string {
    return avatar.startsWith('data:') ? avatar : `data:image/jpeg;base64,${avatar}`;
  }
}
