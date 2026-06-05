import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucidePlus, LucideRotateCcw, LucideUserPlus } from '@lucide/angular';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  NgpDialog,
  NgpDialogDescription,
  NgpDialogOverlay,
  NgpDialogTitle,
} from 'ng-primitives/dialog';
import { GroupsStore } from '../../features/groups/groups.store';
import { AppShellStore } from '../../core/state/app-shell.store';
import { GroupInvitationInfo, GroupsApiClient } from '../../core/http/groups-api.service';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { ZAvatarComponent } from '../../shared/ui/avatar/z-avatar.component';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZEmptyStateComponent } from '../../shared/ui/empty-state/z-empty-state.component';
import { ZGroupCardComponent } from '../../shared/ui/group-card/z-group-card.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';

type InvitationStatus = 'idle' | 'loading' | 'ready' | 'accepting';

@Component({
  selector: 'app-groups-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    NgpDialog,
    NgpDialogDescription,
    NgpDialogOverlay,
    NgpDialogTitle,
    ZAvatarComponent,
    ZBadgeComponent,
    ZButtonComponent,
    ZEmptyStateComponent,
    ZGroupCardComponent,
    ZSkeletonComponent,
    LucidePlus,
    LucideRotateCcw,
    LucideUserPlus,
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
        @if (canCreateGroup()) {
          <a
            routerLink="/create-group"
            class="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--z-primary)] bg-[var(--z-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--z-primary-strong)]"
          >
            <svg lucidePlus class="size-4" aria-hidden="true"></svg>
            <span>{{ 'groups.createNew' | transloco }}</span>
          </a>
        }
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
      } @else if (!store.hasGroups() && canCreateGroup()) {
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
      } @else if (!store.hasGroups()) {
        <z-empty-state
          [title]="'groups.noGroupsYet' | transloco"
          [description]="'groups.noGroupsJoined' | transloco"
        />
      } @else {
        <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          @for (group of store.groups(); track group.id) {
            <a
              class="block h-full rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)]"
              [routerLink]="['/groups', group.id]"
              animate.enter="z-list-enter"
            >
              <z-group-card
                [group]="group"
                [noDescription]="'groups.phase4.noDescription' | transloco"
              />
            </a>
          }
        </section>
      }
    </div>

    @if (invitationDialogVisible()) {
      <div
        ngpDialogOverlay
        animate.enter="z-dialog-overlay-enter"
        animate.leave="z-dialog-overlay-leave"
        class="fixed inset-0 z-50 grid place-items-center bg-stone-950/35 p-4 backdrop-blur-sm"
      >
        <section
          ngpDialog
          [ngpDialogModal]="true"
          animate.enter="z-dialog-panel-enter"
          animate.leave="z-dialog-panel-leave"
          class="w-full max-w-md rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-2xl shadow-stone-950/15"
        >
          @if (invitationStatus() === 'loading') {
            <div class="flex items-start gap-3" aria-hidden="true">
              <z-skeleton class="block size-12 shrink-0"></z-skeleton>
              <div class="grid min-w-0 flex-1 gap-2">
                <z-skeleton class="block h-5 w-40"></z-skeleton>
                <z-skeleton class="block h-4 w-full"></z-skeleton>
                <z-skeleton class="block h-4 w-2/3"></z-skeleton>
              </div>
            </div>
            <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <z-skeleton class="block h-11 w-full sm:w-24"></z-skeleton>
              <z-skeleton class="block h-11 w-full sm:w-32"></z-skeleton>
            </div>
          } @else if (invitation(); as invite) {
            <div class="flex items-start gap-3">
              <z-avatar
                class="size-12"
                [image]="invite.group_avatar || undefined"
                [fallback]="invitationFallback()"
                [alt]="'common.aria.groupAvatar' | transloco"
              />
              <div class="min-w-0">
                <h2 ngpDialogTitle class="text-base font-semibold leading-6 text-[var(--z-text)]">
                  {{ 'groups.invitationDialog.title' | transloco }}
                </h2>
                <p ngpDialogDescription class="mt-2 text-sm leading-6 text-[var(--z-muted)]">
                  {{ 'groups.invitationDialog.invited' | transloco: { group: invite.group_name } }}
                </p>
              </div>
            </div>

            <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <z-button
                type="button"
                variant="secondary"
                [disabled]="invitationStatus() === 'accepting'"
                (pressed)="declineInvitation()"
              >
                {{ 'common.actions.cancel' | transloco }}
              </z-button>
              <z-button
                type="button"
                [disabled]="invitationStatus() === 'accepting'"
                (pressed)="acceptInvitation()"
              >
                <svg lucideUserPlus class="size-4" aria-hidden="true"></svg>
                <span>
                  {{
                    invitationStatus() === 'accepting'
                      ? ('groups.invitationDialog.joining' | transloco)
                      : ('groups.invitationDialog.joinGroup' | transloco)
                  }}
                </span>
              </z-button>
            </div>
          }
        </section>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .z-dialog-overlay-enter {
      animation: z-dialog-overlay-in 120ms ease-out;
    }
    .z-dialog-overlay-leave {
      animation: z-dialog-overlay-out 100ms ease-in;
    }
    .z-dialog-panel-enter {
      animation: z-dialog-panel-in 140ms ease-out;
    }
    .z-dialog-panel-leave {
      animation: z-dialog-panel-out 100ms ease-in;
    }
    @keyframes z-dialog-overlay-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    @keyframes z-dialog-overlay-out {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }
    @keyframes z-dialog-panel-in {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    @keyframes z-dialog-panel-out {
      from {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateY(8px) scale(0.98);
      }
    }
  `,
})
export class GroupsPageComponent {
  protected readonly store = inject(GroupsStore);
  private readonly api = inject(GroupsApiClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly shell = inject(AppShellStore);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly permissions = inject(PermissionsService);
  protected readonly canCreateGroup = () => this.permissions.hasPermission('groups:create');
  protected readonly invitation = signal<GroupInvitationInfo | null>(null);
  protected readonly invitationStatus = signal<InvitationStatus>('idle');
  private readonly currentInviteCode = signal<string | null>(null);
  protected readonly invitationDialogVisible = computed(
    () => this.invitationStatus() === 'loading' || this.invitation() !== null,
  );
  protected readonly invitationFallback = computed(() => {
    const name = this.invitation()?.group_name ?? '';
    return (
      name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join('') || 'G'
    );
  });

  constructor() {
    if (this.store.status() === 'idle') {
      void this.store.loadGroups();
    }

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const inviteCode = params.get('invite')?.trim() ?? '';
      if (!inviteCode) {
        this.resetInvitation();
        return;
      }
      if (inviteCode === this.currentInviteCode() && this.invitationStatus() !== 'idle') {
        return;
      }
      this.loadInvitation(inviteCode);
    });
  }

  protected acceptInvitation(): void {
    const invitation = this.invitation();
    if (!invitation || this.invitationStatus() === 'accepting') {
      return;
    }

    this.invitationStatus.set('accepting');
    this.api
      .acceptInvitation(invitation.code)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.shell.showToast(
            this.transloco.translate('groups.invitationDialog.title'),
            this.transloco.translate('groups.invitationDialog.joined', {
              group: invitation.group_name,
            }),
            'success',
          );
          this.resetInvitation();
          void this.store.loadGroups();
          void this.router.navigate(['/groups', response.group_id], { replaceUrl: true });
        },
        error: () => {
          this.invitationStatus.set('ready');
          this.shell.showToast(
            this.transloco.translate('groups.invitationDialog.title'),
            this.transloco.translate('groups.invitationDialog.joinFailed'),
            'error',
          );
        },
      });
  }

  protected declineInvitation(): void {
    this.resetInvitation();
    this.clearInviteParam();
  }

  private loadInvitation(code: string): void {
    this.currentInviteCode.set(code);
    this.invitation.set(null);
    this.invitationStatus.set('loading');

    this.api
      .getInvitationInfo(code)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (info) => {
          if (this.currentInviteCode() !== code) {
            return;
          }

          if (info.already_member) {
            this.shell.showToast(
              this.transloco.translate('groups.invitationDialog.title'),
              this.transloco.translate('groups.invitationDialog.alreadyMember', {
                group: info.group_name,
              }),
              'info',
            );
            this.resetInvitation();
            void this.router.navigate(['/groups', info.group_id], { replaceUrl: true });
            return;
          }

          this.invitation.set(info);
          this.invitationStatus.set('ready');
        },
        error: () => {
          if (this.currentInviteCode() !== code) {
            return;
          }

          this.shell.showToast(
            this.transloco.translate('groups.invitationDialog.title'),
            this.transloco.translate('groups.invitationDialog.notFound'),
            'error',
          );
          this.resetInvitation();
          this.clearInviteParam();
        },
      });
  }

  private resetInvitation(): void {
    this.currentInviteCode.set(null);
    this.invitation.set(null);
    this.invitationStatus.set('idle');
  }

  private clearInviteParam(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { invite: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
