import { Component, OnInit, inject, input, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucideEye, LucideLink, LucidePlus, LucideRefreshCw, LucideTrash2 } from '@lucide/angular';
import { NgpDialogTrigger } from 'ng-primitives/dialog';
import { GroupInvitation, GroupsApiClient } from '../../core/http/groups-api.service';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { AppShellStore } from '../../core/state/app-shell.store';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZConfirmDialogComponent } from '../../shared/ui/dialog/z-confirm-dialog.component';
import { ZEmptyStateComponent } from '../../shared/ui/empty-state/z-empty-state.component';
import { ZIconButtonComponent } from '../../shared/ui/icon-button/z-icon-button.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';
import { GroupInvitationDialogComponent } from './group-invitation-dialog.component';

type LoadStatus = 'idle' | 'loading' | 'success' | 'error';
type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'app-group-invitations-section',
  imports: [
    TranslocoPipe,
    NgpDialogTrigger,
    LucideEye,
    LucideLink,
    LucidePlus,
    LucideRefreshCw,
    LucideTrash2,
    GroupInvitationDialogComponent,
    ZBadgeComponent,
    ZButtonComponent,
    ZConfirmDialogComponent,
    ZEmptyStateComponent,
    ZIconButtonComponent,
    ZSkeletonComponent,
  ],
  template: `
    <section class="overflow-hidden rounded-lg border border-[var(--z-border)] bg-white shadow-sm">
      <div
        class="flex flex-col gap-4 border-b border-[var(--z-border)] p-5 sm:flex-row sm:items-start"
      >
        <span
          class="grid size-10 shrink-0 place-items-center rounded-md bg-[var(--z-surface-warm)] text-[var(--z-primary)]"
        >
          <svg lucideLink class="size-5" aria-hidden="true"></svg>
        </span>
        <div class="min-w-0 flex-1">
          <h3 class="text-base font-semibold">{{ 'groups.invitations.title' | transloco }}</h3>
          <p class="mt-1 max-w-2xl text-sm leading-5 text-[var(--z-muted)]">
            {{ 'groups.invitations.description' | transloco }}
          </p>
        </div>
        @if (canCreate()) {
          <ng-template #createDialog let-close="close">
            <app-group-invitation-dialog [groupId]="groupId()" [close]="close" />
          </ng-template>
          <z-button
            size="sm"
            [mobileFullWidth]="true"
            [ngpDialogTrigger]="createDialog"
            (ngpDialogTriggerClosed)="invitationDialogClosed($event)"
          >
            <svg lucidePlus class="size-4" aria-hidden="true"></svg>
            {{ 'common.actions.createInvitation' | transloco }}
          </z-button>
        }
      </div>

      <div class="p-5">
        @if (status() === 'loading') {
          <div class="grid gap-2" aria-hidden="true">
            @for (_ of [1, 2, 3]; track $index) {
              <z-skeleton class="block h-20"></z-skeleton>
            }
          </div>
        } @else if (status() === 'error') {
          <div class="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <p>{{ 'groups.invitations.loadError' | transloco }}</p>
            <z-button class="mt-3" variant="secondary" size="sm" (pressed)="load()">
              <svg lucideRefreshCw class="size-4" aria-hidden="true"></svg>
              {{ 'common.actions.retry' | transloco }}
            </z-button>
          </div>
        } @else if (invitations().length) {
          <div class="overflow-hidden rounded-md border border-[var(--z-border)]">
            <div
              class="hidden border-b border-[var(--z-border)] bg-[var(--z-surface-warm)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--z-muted)] md:grid md:grid-cols-[minmax(12rem,0.8fr)_minmax(12rem,1.2fr)_minmax(10rem,0.7fr)_9rem] md:gap-4"
              aria-hidden="true"
            >
              <span>{{ 'groups.invitations.columns.code' | transloco }}</span>
              <span>{{ 'groups.invitations.columns.recipient' | transloco }}</span>
              <span>{{ 'groups.invitations.columns.status' | transloco }}</span>
              <span>{{ 'groups.invitations.columns.actions' | transloco }}</span>
            </div>
            <ul class="divide-y divide-[var(--z-border)]">
              @for (invitation of invitations(); track invitation.id) {
                <li
                  data-testid="group-invitation-row"
                  class="grid gap-3 p-4 md:grid-cols-[minmax(12rem,0.8fr)_minmax(12rem,1.2fr)_minmax(10rem,0.7fr)_9rem] md:items-center md:gap-4"
                >
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <code class="font-mono text-lg font-semibold tracking-wider">{{
                        invitation.code
                      }}</code>
                      <z-badge tone="primary">{{
                        'groups.invitations.delivery.' + invitation.delivery | transloco
                      }}</z-badge>
                    </div>
                  </div>

                  <p class="min-w-0 truncate text-sm text-[var(--z-muted)]">
                    {{ invitation.email || ('groups.invitations.anyone' | transloco) }}
                  </p>

                  <div class="min-w-0">
                    <z-badge [tone]="statusTone(invitation.status)">{{
                      'groups.invitations.status.' + invitation.status | transloco
                    }}</z-badge>
                    <p class="mt-1 text-xs text-[var(--z-muted)]">{{ statusDate(invitation) }}</p>
                  </div>

                  <div
                    data-testid="group-invitation-actions"
                    class="grid grid-cols-[6rem_2.5rem] items-center gap-1 md:justify-self-end"
                  >
                    <ng-template #detailsDialog let-close="close">
                      <app-group-invitation-dialog
                        [groupId]="groupId()"
                        [existingInvitation]="invitation"
                        [close]="close"
                      />
                    </ng-template>
                    <z-button variant="ghost" size="sm" [ngpDialogTrigger]="detailsDialog">
                      <svg lucideEye class="size-4" aria-hidden="true"></svg>
                      {{ 'groups.invitations.open' | transloco }}
                    </z-button>

                    @if (invitation.status === 'pending' && canRevoke()) {
                      <ng-template #revokeDialog let-close="close">
                        <z-confirm-dialog
                          [title]="'groups.invitations.revokeTitle' | transloco"
                          [description]="'groups.invitations.revokeDescription' | transloco"
                          [confirmLabel]="'groups.invitations.revoke' | transloco"
                          [cancelLabel]="'common.actions.cancel' | transloco"
                          confirmVariant="danger"
                          tone="danger"
                          [close]="close"
                        />
                      </ng-template>
                      <z-icon-button
                        size="sm"
                        [label]="'groups.invitations.revoke' | transloco"
                        [disabled]="revokingId() === invitation.id"
                        [ngpDialogTrigger]="revokeDialog"
                        (ngpDialogTriggerClosed)="confirmRevoke($event, invitation)"
                      >
                        <svg lucideTrash2 class="size-4" aria-hidden="true"></svg>
                      </z-icon-button>
                    } @else {
                      <span
                        data-testid="revoke-placeholder"
                        class="size-10"
                        aria-hidden="true"
                      ></span>
                    }
                  </div>
                </li>
              }
            </ul>
          </div>
        } @else {
          <z-empty-state
            [title]="'groups.invitations.empty' | transloco"
            [description]="'groups.invitations.emptyDescription' | transloco"
          />
        }
      </div>
    </section>
  `,
})
export class GroupInvitationsSectionComponent implements OnInit {
  readonly groupId = input.required<string>();
  private readonly api = inject(GroupsApiClient);
  private readonly permissions = inject(PermissionsService);
  private readonly shell = inject(AppShellStore);
  private readonly transloco = inject(TranslocoService);
  protected readonly invitations = signal<GroupInvitation[]>([]);
  protected readonly status = signal<LoadStatus>('idle');
  protected readonly revokingId = signal('');

  ngOnInit(): void {
    this.load();
  }

  protected canCreate(): boolean {
    return this.permissions.hasPermission('groups:invites:create');
  }

  protected canRevoke(): boolean {
    return this.permissions.hasPermission('groups:invites:revoke');
  }

  protected load(): void {
    this.status.set('loading');
    this.api.listGroupInvitations(this.groupId()).subscribe({
      next: (invitations) => {
        this.invitations.set(invitations);
        this.status.set('success');
      },
      error: () => this.status.set('error'),
    });
  }

  protected invitationDialogClosed(result: unknown): void {
    if (result === true) this.load();
  }

  protected confirmRevoke(result: unknown, invitation: GroupInvitation): void {
    if (result !== true || invitation.status !== 'pending' || this.revokingId()) return;
    this.revokingId.set(invitation.id);
    this.api.revokeGroupInvitation(this.groupId(), invitation.id).subscribe({
      next: () => {
        this.revokingId.set('');
        this.shell.showToast(
          this.transloco.translate('toast.successTitle'),
          this.transloco.translate('groups.invitations.revoked'),
          'success',
        );
        this.load();
      },
      error: () => {
        this.revokingId.set('');
        this.shell.showToast(
          this.transloco.translate('toast.errorTitle'),
          this.transloco.translate('groups.invitations.revokeError'),
          'error',
        );
      },
    });
  }

  protected statusTone(status: GroupInvitation['status']): BadgeTone {
    if (status === 'pending') return 'success';
    if (status === 'accepted') return 'neutral';
    if (status === 'declined') return 'warning';
    return 'danger';
  }

  protected statusDate(invitation: GroupInvitation): string {
    const raw = invitation.status_changed_at || invitation.created_at;
    if (!raw) return '';
    const date = new Intl.DateTimeFormat(this.transloco.getActiveLang(), {
      dateStyle: 'medium',
    }).format(new Date(raw));
    const key = invitation.status_changed_at ? invitation.status : 'created';
    return this.transloco.translate(`groups.invitations.date.${key}`, { date });
  }
}
