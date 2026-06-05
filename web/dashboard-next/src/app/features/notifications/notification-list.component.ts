import { NgClass } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  LucideCalendarDays,
  LucideCheck,
  LucideCircleCheck,
  LucideFileVideo,
  LucideUserRound,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import { NotificationItem } from '../../core/http/notifications-api.service';
import { RelativeTimePipe } from '../../core/i18n/relative-time.pipe';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZEmptyStateComponent } from '../../shared/ui/empty-state/z-empty-state.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';
import { presentNotification } from './notification-presenter';
import { NotificationDayGroup } from './notifications.store';

const SKELETON_ROWS = [0, 1, 2, 3];

// Shared notification list body used by both the navbar dropdown and the full
// "All notifications" page. Renders day groups, per-type icons, inline invite
// actions, plus loading (skeleton) and empty states.
@Component({
  selector: 'z-notification-list',
  imports: [
    NgClass,
    RouterLink,
    TranslocoPipe,
    RelativeTimePipe,
    ZButtonComponent,
    ZSkeletonComponent,
    ZEmptyStateComponent,
    LucideUsers,
    LucideUserRound,
    LucideCircleCheck,
    LucideFileVideo,
    LucideCalendarDays,
    LucideCheck,
    LucideX,
  ],
  template: `
    @if (loading()) {
      <div class="px-2 py-1.5">
        @for (row of skeletonRows; track row) {
          <div class="flex items-start gap-3 px-2 py-3">
            <z-skeleton class="size-8 rounded-full" />
            <div class="flex-1 space-y-2 pt-1">
              <z-skeleton class="h-2.5 w-[92%]" />
              <z-skeleton class="h-2.5 w-2/5" />
            </div>
          </div>
        }
      </div>
    } @else if (groups().length === 0) {
      <div class="p-4">
        <z-empty-state [title]="emptyTitle()" [description]="emptyDescription()" />
      </div>
    } @else {
      @for (group of groups(); track group.key) {
        <div class="border-t border-[var(--z-border)] first:border-t-0">
          <p
            class="px-4 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--z-muted)]"
          >
            {{ group.labelKey | transloco }}
          </p>
          @for (item of group.items; track item.id) {
            @let view = present(item);
            <div
              class="relative grid grid-cols-[auto_1fr_auto] items-start gap-3 px-4 transition-colors"
              [ngClass]="rowClass(item)"
            >
              <a
                [routerLink]="isInvite(item) ? null : view.link"
                [queryParams]="isInvite(item) ? null : (view.queryParams ?? null)"
                class="absolute inset-0"
                [ngClass]="isInvite(item) ? 'pointer-events-none' : 'cursor-pointer'"
                [attr.aria-label]="view.messageKey | transloco: view.params"
                (click)="open.emit(item)"
              ></a>

              <span
                class="relative mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md"
                [ngClass]="iconClasses(view.icon)"
              >
                @switch (view.icon) {
                  @case ('member') {
                    <svg lucideUserRound class="size-4" aria-hidden="true"></svg>
                  }
                  @case ('review') {
                    <svg lucideCircleCheck class="size-4" aria-hidden="true"></svg>
                  }
                  @case ('upload') {
                    <svg lucideFileVideo class="size-4" aria-hidden="true"></svg>
                  }
                  @case ('booking') {
                    <svg lucideCalendarDays class="size-4" aria-hidden="true"></svg>
                  }
                  @default {
                    <svg lucideUsers class="size-4" aria-hidden="true"></svg>
                  }
                }
              </span>

              <div class="min-w-0">
                <p class="text-[13.5px] leading-relaxed text-[var(--z-text)]">
                  {{ view.messageKey | transloco: view.params }}
                </p>
                <p class="mt-0.5 text-xs text-[var(--z-muted)]">
                  {{ item.created_at | relativeTime }}
                </p>

                @if (showActions(item)) {
                  <div class="relative z-10 mt-2.5 flex gap-2">
                    <z-button size="sm" variant="primary" (pressed)="accept.emit(item)">
                      {{ 'notifications.invite.accept' | transloco }}
                    </z-button>
                    <z-button size="sm" variant="secondary" (pressed)="decline.emit(item)">
                      {{ 'notifications.invite.decline' | transloco }}
                    </z-button>
                  </div>
                } @else if (resolved(item) === 'accepted') {
                  <p
                    class="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--z-success)]"
                  >
                    <svg lucideCheck class="size-3.5" aria-hidden="true"></svg>
                    {{
                      'notifications.invite.accepted'
                        | transloco: { group: item.payload.group_name }
                    }}
                  </p>
                } @else if (resolved(item) === 'declined') {
                  <p
                    class="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--z-muted)]"
                  >
                    <svg lucideX class="size-3.5" aria-hidden="true"></svg>
                    {{ 'notifications.invite.declined' | transloco }}
                  </p>
                } @else if (isInvite(item) && item.invite_status === 'expired') {
                  <p class="mt-2 text-xs font-semibold text-[var(--z-muted)]">
                    {{ 'notifications.invite.expired' | transloco }}
                  </p>
                }
              </div>

              @if (unread(item)) {
                <span
                  class="relative mt-1.5 size-2 shrink-0 rounded-full bg-[var(--z-primary)]"
                  [attr.aria-label]="'notifications.unread' | transloco"
                ></span>
              }
            </div>
          }
        </div>
      }
    }
  `,
})
export class NotificationListComponent {
  readonly groups = input.required<NotificationDayGroup[]>();
  readonly loading = input(false);
  readonly compact = input(false);
  readonly arrivedId = input<string | null>(null);
  readonly emptyTitle = input('');
  readonly emptyDescription = input('');

  readonly open = output<NotificationItem>();
  readonly accept = output<NotificationItem>();
  readonly decline = output<NotificationItem>();

  protected readonly skeletonRows = SKELETON_ROWS;

  protected present(item: NotificationItem) {
    return presentNotification(item);
  }

  protected isInvite(item: NotificationItem): boolean {
    return item.type === 'group_invitation_received';
  }

  // Resolution of an invitation row, preferring the optimistic client state and
  // falling back to the server-reported status (survives reloads / cross-device).
  protected resolved(item: NotificationItem): 'accepted' | 'declined' | null {
    if (item.inviteState) {
      return item.inviteState;
    }
    if (item.invite_status === 'accepted') {
      return 'accepted';
    }
    if (item.invite_status === 'declined') {
      return 'declined';
    }
    return null;
  }

  // Offer accept/decline only while the invitation is still actionable.
  protected showActions(item: NotificationItem): boolean {
    return this.isInvite(item) && !this.resolved(item) && item.invite_status !== 'expired';
  }

  protected unread(item: NotificationItem): boolean {
    return !item.read && this.resolved(item) !== 'declined';
  }

  protected rowClass(item: NotificationItem): string {
    const parts = [this.compact() ? 'py-2.5' : 'py-3'];
    if (this.unread(item)) {
      parts.push('bg-[var(--z-surface-warm)]/60');
    }
    if (item.id === this.arrivedId()) {
      parts.push('animate-[z-arrive_1.4s_ease-out]');
    }
    return parts.join(' ');
  }

  // Per-type icon tile colours, faithful to the design handoff. Soft tints come
  // from an opacity modifier on the solid token (no dedicated *-soft tokens).
  protected iconClasses(icon: string): string {
    switch (icon) {
      case 'member':
      case 'review':
        return 'bg-[var(--z-success)]/12 text-[var(--z-success)]';
      case 'booking':
        return 'bg-[var(--z-warning)]/12 text-[var(--z-warning)]';
      default:
        return 'bg-[var(--z-surface-warm)] text-[var(--z-primary-strong)]';
    }
  }
}
