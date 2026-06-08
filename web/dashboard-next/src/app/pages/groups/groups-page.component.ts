import {
  Component,
  DestroyRef,
  TemplateRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucidePlus, LucideRotateCcw, LucideUserPlus } from '@lucide/angular';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { NgpDialogManager, NgpDialogRef, type NgpDialogContext } from 'ng-primitives/dialog';
import { take } from 'rxjs';
import { GroupsStore } from '../../features/groups/groups.store';
import { AppShellStore } from '../../core/state/app-shell.store';
import { GroupInvitationInfo, GroupsApiClient } from '../../core/http/groups-api.service';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { ZAvatarComponent } from '../../shared/ui/avatar/z-avatar.component';
import { ZActionDialogComponent } from '../../shared/ui/dialog/z-action-dialog.component';
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
    ZAvatarComponent,
    ZActionDialogComponent,
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
            class="inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border border-[var(--z-primary)] bg-[var(--z-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--z-primary-strong)] sm:w-auto"
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

    <ng-template #invitationDialog let-close="close">
      <z-action-dialog
        [title]="'groups.invitationDialog.title' | transloco"
        [description]="
          invitation()
            ? ('groups.invitationDialog.invited' | transloco: { group: invitation()?.group_name })
            : ''
        "
        tone="info"
        [showToneIcon]="false"
        [hasProjectedMedia]="invitation() !== null"
        [confirmLabel]="
          invitation()
            ? invitationStatus() === 'accepting'
              ? ('groups.invitationDialog.joining' | transloco)
              : ('groups.invitationDialog.joinGroup' | transloco)
            : ''
        "
        [cancelLabel]="invitation() ? ('common.actions.cancel' | transloco) : ''"
        [confirmDisabled]="invitationStatus() === 'accepting'"
        [cancelDisabled]="invitationStatus() === 'accepting'"
        [confirmCloses]="false"
        [close]="close"
        (confirmed)="acceptInvitation()"
      >
        @if (invitation(); as invite) {
          <z-avatar
            z-dialog-media
            class="size-12"
            [image]="invite.group_avatar || undefined"
            [fallback]="invitationFallback()"
            [alt]="'common.aria.groupAvatar' | transloco"
          />
        }
        @if (invitation()) {
          <svg z-dialog-confirm-icon lucideUserPlus class="size-4" aria-hidden="true"></svg>
        }
        @if (!invitation()) {
          <div class="mt-4 flex items-start gap-3" aria-hidden="true">
            <z-skeleton class="block size-12 shrink-0"></z-skeleton>
            <div class="grid min-w-0 flex-1 gap-2">
              <z-skeleton class="block h-5 w-40"></z-skeleton>
              <z-skeleton class="block h-4 w-full"></z-skeleton>
              <z-skeleton class="block h-4 w-2/3"></z-skeleton>
            </div>
          </div>
        }
      </z-action-dialog>
    </ng-template>
  `,
})
export class GroupsPageComponent {
  protected readonly store = inject(GroupsStore);
  private readonly api = inject(GroupsApiClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly shell = inject(AppShellStore);
  private readonly transloco = inject(TranslocoService);
  private readonly dialogManager = inject(NgpDialogManager);
  private readonly destroyRef = inject(DestroyRef);
  private readonly permissions = inject(PermissionsService);
  private readonly invitationDialogTemplate =
    viewChild<TemplateRef<NgpDialogContext<void, boolean>>>('invitationDialog');
  private invitationDialogRef: NgpDialogRef<void, boolean> | null = null;
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

    effect(() => {
      const template = this.invitationDialogTemplate();
      const shouldOpen = this.invitationDialogVisible();

      if (shouldOpen && template && !this.invitationDialogRef) {
        this.openInvitationDialog(template);
      }

      if (!shouldOpen && this.invitationDialogRef) {
        const dialogRef = this.invitationDialogRef;
        this.invitationDialogRef = null;
        void dialogRef.close();
      }
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
          this.closeInvitationDialog();
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
    if (this.invitationStatus() === 'accepting') {
      return;
    }

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
            this.closeInvitationDialog();
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

  private openInvitationDialog(template: TemplateRef<NgpDialogContext<void, boolean>>): void {
    const dialogRef = this.dialogManager.open<void, boolean>(template, {
      closeOnNavigation: false,
      closeOnEscape: () => this.invitationStatus() !== 'accepting',
      closeOnOutsideClick: () => this.invitationStatus() !== 'accepting',
    });
    this.invitationDialogRef = dialogRef;

    dialogRef.afterClosed.pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      if (this.invitationDialogRef === dialogRef) {
        this.invitationDialogRef = null;
      }

      if (result === true) {
        this.acceptInvitation();
        return;
      }

      if (this.invitationStatus() === 'ready') {
        this.declineInvitation();
      }
    });
  }

  private closeInvitationDialog(): void {
    const dialogRef = this.invitationDialogRef;
    if (!dialogRef) {
      return;
    }

    this.invitationDialogRef = null;
    void dialogRef.close();
  }
}
