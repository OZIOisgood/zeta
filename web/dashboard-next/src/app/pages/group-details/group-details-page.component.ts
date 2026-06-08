import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LucideLink,
  LucideRefreshCw,
  LucideSettings,
  LucideShieldCheck,
  LucideTrash2,
  LucideUsers,
} from '@lucide/angular';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { NgpDialogTrigger } from 'ng-primitives/dialog';
import { GroupMember, GroupMembersListKind } from '../../core/http/groups-api.service';
import { GroupsStore } from '../../features/groups/groups.store';
import { SessionStore } from '../../features/session/session.store';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { AppShellStore } from '../../core/state/app-shell.store';
import { ZAvatarComponent } from '../../shared/ui/avatar/z-avatar.component';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZBreadcrumbsComponent } from '../../shared/ui/breadcrumbs/z-breadcrumbs.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZConfirmDialogComponent } from '../../shared/ui/dialog/z-confirm-dialog.component';
import { ZEmptyStateComponent } from '../../shared/ui/empty-state/z-empty-state.component';
import { ZIconButtonComponent } from '../../shared/ui/icon-button/z-icon-button.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';
import { GroupInvitationDialogComponent } from './group-invitation-dialog.component';

@Component({
  selector: 'app-group-details-page',
  imports: [
    NgpDialogTrigger,
    RouterLink,
    TranslocoPipe,
    ZAvatarComponent,
    ZBadgeComponent,
    ZBreadcrumbsComponent,
    ZButtonComponent,
    ZConfirmDialogComponent,
    ZEmptyStateComponent,
    GroupInvitationDialogComponent,
    ZIconButtonComponent,
    ZSkeletonComponent,
    LucideLink,
    LucideRefreshCw,
    LucideSettings,
    LucideShieldCheck,
    LucideTrash2,
    LucideUsers,
  ],
  template: `
    <div class="grid gap-6">
      @if (store.detailStatus() === 'loading') {
        <z-breadcrumbs
          [items]="[
            { label: 'common.nav.groups', routerLink: '/groups' },
            { label: '...', translate: false },
          ]"
        />
        <z-skeleton class="block h-56 w-full"></z-skeleton>
      } @else if (store.detailStatus() === 'error') {
        <z-breadcrumbs
          [items]="[
            { label: 'common.nav.groups', routerLink: '/groups' },
            { label: 'groups.phase4.detailFailed' },
          ]"
        />
        <z-empty-state
          [title]="'groups.phase4.detailFailed' | transloco"
          [description]="store.detailError() || ('home.error.description' | transloco)"
        />
      } @else if (store.activeGroup(); as group) {
        <z-breadcrumbs
          [items]="[
            { label: 'common.nav.groups', routerLink: '/groups' },
            { label: group.name, translate: false },
          ]"
        />
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
              <h2 class="text-2xl font-semibold sm:text-3xl">{{ group.name }}</h2>
              <p class="mt-3 max-w-3xl text-sm leading-6 text-[var(--z-muted)]">
                {{ group.description || ('groups.phase4.noDescription' | transloco) }}
              </p>
            </div>
            @if (canOpenPreferences()) {
              <a
                class="inline-flex min-h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border border-[var(--z-border)] bg-white px-3 text-sm font-semibold transition hover:bg-[var(--z-surface-warm)] sm:w-auto"
                [routerLink]="[
                  '/groups',
                  group.id,
                  'preferences',
                  canEditPreferences() ? 'general' : 'delete',
                ]"
              >
                <svg lucideSettings class="size-4" aria-hidden="true"></svg>
                <span>{{ 'groups.preferences' | transloco }}</span>
              </a>
            }
          </div>
        </section>

        @if (canInviteStudents()) {
          <ng-template #inviteDialog let-close="close">
            <app-group-invitation-dialog [groupId]="group.id" [close]="close" />
          </ng-template>
          <article
            class="rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4"
          >
            <div class="flex items-start gap-3">
              <span
                class="grid size-10 place-items-center rounded-md bg-[var(--z-surface-warm)] text-[var(--z-primary)]"
              >
                <svg lucideLink class="size-5" aria-hidden="true"></svg>
              </span>
              <div>
                <h3 class="text-base font-semibold">
                  {{ 'groups.createInvitationTitle' | transloco }}
                </h3>
                <p class="mt-1 text-sm leading-6 text-[var(--z-muted)]">
                  {{ 'groups.inviteDialog.cardDescription' | transloco }}
                </p>
              </div>
            </div>
            <z-button
              class="mt-4 block sm:mt-0"
              type="button"
              [mobileFullWidth]="true"
              [nowrap]="true"
              [ngpDialogTrigger]="inviteDialog"
            >
              <span>{{ 'common.actions.createInvitation' | transloco }}</span>
            </z-button>
          </article>
        }

        @if (memberSections().length) {
          <section class="grid gap-4 xl:grid-cols-2">
            @for (section of memberSections(); track section.kind) {
              <article class="rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div class="flex items-start gap-3">
                    <span
                      class="grid size-10 place-items-center rounded-md bg-[var(--z-surface-warm)] text-[var(--z-primary)]"
                    >
                      @if (section.kind === 'experts') {
                        <svg lucideShieldCheck class="size-5" aria-hidden="true"></svg>
                      } @else {
                        <svg lucideUsers class="size-5" aria-hidden="true"></svg>
                      }
                    </span>
                    <div>
                      <div class="flex flex-wrap items-center gap-2">
                        <h3 class="text-base font-semibold">{{ section.titleKey | transloco }}</h3>
                        <z-badge tone="neutral">{{ section.members.length }}</z-badge>
                      </div>
                      <p class="mt-1 text-sm leading-6 text-[var(--z-muted)]">
                        {{ section.descriptionKey | transloco }}
                      </p>
                    </div>
                  </div>
                </div>

                @if (section.status === 'loading') {
                  <div class="mt-5 grid gap-3" aria-hidden="true">
                    @for (item of [1, 2, 3]; track item) {
                      <z-skeleton class="block h-16 w-full"></z-skeleton>
                    }
                  </div>
                } @else if (section.status === 'error') {
                  <div
                    class="mt-5 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
                  >
                    <p>{{ section.error || ('groups.membersLoadFailed' | transloco) }}</p>
                    <z-button
                      class="mt-3"
                      variant="secondary"
                      size="sm"
                      type="button"
                      (pressed)="reloadMembers(group.id, section.kind)"
                    >
                      <svg lucideRefreshCw class="size-4" aria-hidden="true"></svg>
                      <span>{{ 'common.actions.retry' | transloco }}</span>
                    </z-button>
                  </div>
                } @else if (section.members.length) {
                  <ul class="mt-5 divide-y divide-[var(--z-border)]">
                    @for (member of section.members; track member.id) {
                      <li class="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <z-avatar
                          class="size-11"
                          [image]="member.avatar"
                          [fallback]="memberInitials(member)"
                          [alt]="member.name"
                        />
                        <div class="min-w-0 flex-1">
                          <div class="flex flex-wrap items-center gap-2">
                            <p class="truncate text-sm font-semibold">{{ member.name }}</p>
                            @if (member.role) {
                              <z-badge tone="primary">
                                {{ 'groups.roles.' + member.role | transloco }}
                              </z-badge>
                            }
                          </div>
                          <p class="truncate text-sm text-[var(--z-muted)]">{{ member.email }}</p>
                        </div>

                        @if (canRemoveUsers() && !isCurrentUser(member.id)) {
                          <ng-template #removeMemberDialog let-close="close">
                            <z-confirm-dialog
                              [title]="'groups.users.removeUser' | transloco"
                              [description]="
                                'groups.users.confirmRemove' | transloco: { name: member.name }
                              "
                              tone="danger"
                              [confirmLabel]="'common.actions.remove' | transloco"
                              [cancelLabel]="'common.actions.cancel' | transloco"
                              [close]="close"
                            />
                          </ng-template>
                          <z-icon-button
                            variant="ghost"
                            size="sm"
                            [label]="'groups.users.removeUser' | transloco"
                            [disabled]="store.mutationStatus() === 'loading'"
                            [ngpDialogTrigger]="removeMemberDialog"
                            (ngpDialogTriggerClosed)="confirmRemoveMember($event, group.id, member)"
                          >
                            <svg lucideTrash2 class="size-4" aria-hidden="true"></svg>
                          </z-icon-button>
                        }
                      </li>
                    }
                  </ul>
                } @else {
                  <z-empty-state
                    class="mt-5 block"
                    [title]="section.emptyTitleKey | transloco"
                    [description]="section.emptyDescriptionKey | transloco"
                  >
                  </z-empty-state>
                }
              </article>
            }
          </section>
        } @else {
          <z-empty-state
            [title]="'groups.membersUnavailable' | transloco"
            [description]="'groups.membersUnavailableDescription' | transloco"
          />
        }
      }
    </div>
  `,
})
export class GroupDetailsPageComponent {
  protected readonly store = inject(GroupsStore);
  private readonly session = inject(SessionStore);
  private readonly permissions = inject(PermissionsService);
  private readonly shell = inject(AppShellStore);
  private readonly transloco = inject(TranslocoService);
  protected readonly canEditPreferences = () =>
    this.permissions.hasPermission('groups:preferences:edit');
  protected readonly canOpenPreferences = () =>
    this.canEditPreferences() || this.permissions.hasPermission('groups:membership:leave');
  protected readonly canReadStudents = computed(() =>
    this.permissions.hasPermission('groups:user-list:read'),
  );
  protected readonly canReadExperts = computed(() =>
    this.permissions.hasPermission('groups:expert-list:read'),
  );
  protected readonly canInviteStudents = computed(() =>
    this.permissions.hasPermission('groups:invites:create'),
  );
  protected readonly canRemoveUsers = computed(() =>
    this.permissions.hasPermission('groups:user-list:delete'),
  );
  protected readonly memberSections = computed(() => {
    const sections: MemberSection[] = [];

    if (this.canReadExperts()) {
      sections.push({
        kind: 'experts',
        titleKey: 'groups.experts',
        descriptionKey: 'groups.expertsDescription',
        emptyTitleKey: 'groups.noExperts',
        emptyDescriptionKey: 'groups.noExpertsDescription',
        members: this.store.groupExperts(),
        status: this.store.expertsStatus(),
        error: this.store.expertsError(),
      });
    }

    if (this.canReadStudents()) {
      sections.push({
        kind: 'students',
        titleKey: 'groups.students',
        descriptionKey: 'groups.studentsDescription',
        emptyTitleKey: 'groups.noStudents',
        emptyDescriptionKey: 'groups.inviteStudents',
        members: this.store.groupStudents(),
        status: this.store.studentsStatus(),
        error: this.store.studentsError(),
      });
    }

    return sections;
  });

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const groupId = params.get('id');
        if (groupId) {
          this.store.resetGroupMembers();
          void this.store.loadGroup(groupId);
          void this.loadVisibleMembers(groupId);
        }
      });
  }

  protected avatarSrc(avatar: string): string {
    return avatar.startsWith('data:') ? avatar : `data:image/jpeg;base64,${avatar}`;
  }

  protected memberInitials(member: GroupMember): string {
    return (
      member.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join('')
        .toUpperCase() || member.email.charAt(0).toUpperCase()
    );
  }

  protected isCurrentUser(userId: string): boolean {
    return this.session.user()?.id === userId;
  }

  protected reloadMembers(groupId: string, kind: GroupMembersListKind): void {
    void this.store.loadGroupMembers(groupId, kind);
  }

  protected async confirmRemoveMember(
    result: unknown,
    groupId: string,
    member: GroupMember,
  ): Promise<void> {
    if (result !== true || !this.canRemoveUsers()) {
      return;
    }

    const removed = await this.store.removeGroupMember(groupId, member.id);
    if (removed) {
      this.shell.showToast(
        this.transloco.translate('toast.successTitle'),
        this.transloco.translate('groups.users.removed', { name: member.name }),
        'success',
      );
      return;
    }

    this.shell.showToast(
      this.transloco.translate('toast.errorTitle'),
      this.store.mutationError() || this.transloco.translate('groups.users.removeFailed'),
      'error',
    );
  }

  private async loadVisibleMembers(groupId: string): Promise<void> {
    const tasks: Promise<void>[] = [];

    if (this.canReadStudents()) {
      tasks.push(this.store.loadGroupMembers(groupId, 'students'));
    }

    if (this.canReadExperts()) {
      tasks.push(this.store.loadGroupMembers(groupId, 'experts'));
    }

    await Promise.all(tasks);
  }
}

type MemberSection = {
  kind: GroupMembersListKind;
  titleKey: string;
  descriptionKey: string;
  emptyTitleKey: string;
  emptyDescriptionKey: string;
  members: GroupMember[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
};
