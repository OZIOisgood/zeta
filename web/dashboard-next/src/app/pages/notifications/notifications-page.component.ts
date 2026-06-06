import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucideCheckCheck } from '@lucide/angular';
import { NotificationItem } from '../../core/http/notifications-api.service';
import { NotificationListComponent } from '../../features/notifications/notification-list.component';
import { presentNotification } from '../../features/notifications/notification-presenter';
import {
  NotificationDayGroup,
  NotificationsStore,
} from '../../features/notifications/notifications.store';
import { AppShellStore } from '../../core/state/app-shell.store';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZTabsComponent } from '../../shared/ui/tabs/z-tabs.component';

type NotificationFilter = 'all' | 'unread';

// Full "All notifications" page, reached only via the dropdown footer link (no
// sidebar entry). Reuses the shared NotificationListComponent and adds tab
// filtering plus a mark-all-read action.
@Component({
  selector: 'app-notifications-page',
  imports: [
    TranslocoPipe,
    NotificationListComponent,
    ZButtonComponent,
    ZTabsComponent,
    LucideCheckCheck,
  ],
  template: `
    <div class="grid gap-6">
      <section
        class="grid gap-4 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
      >
        <div>
          <h2 class="text-2xl font-semibold sm:text-3xl">
            {{ 'notifications.title' | transloco }}
          </h2>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-[var(--z-muted)]">
            {{ 'notifications.page.description' | transloco }}
          </p>
        </div>
        @if (store.hasUnread()) {
          <z-button variant="secondary" size="sm" (pressed)="store.markAllRead()">
            <svg lucideCheckCheck class="size-4" aria-hidden="true"></svg>
            <span>{{ 'notifications.markAllRead' | transloco }}</span>
          </z-button>
        }
      </section>

      <z-tabs
        tabsId="notifications-tabs"
        [label]="'notifications.page.filtersLabel' | transloco"
        [value]="filter()"
        [options]="filterOptions()"
        (valueChange)="setFilter($event)"
      />

      <section
        class="overflow-hidden rounded-lg border border-[var(--z-border)] bg-white shadow-sm"
      >
        <z-notification-list
          [groups]="viewGroups()"
          [loading]="store.status() === 'loading'"
          [arrivedId]="store.lastArrivedId()"
          [emptyTitle]="emptyTitle()"
          [emptyDescription]="emptyDescription()"
          (open)="onOpen($event)"
          (accept)="onAccept($event)"
          (decline)="onDecline($event)"
        />
      </section>
    </div>
  `,
})
export class NotificationsPageComponent {
  protected readonly store = inject(NotificationsStore);
  private readonly shell = inject(AppShellStore);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  protected readonly filter = signal<NotificationFilter>('all');

  protected readonly viewGroups = computed<NotificationDayGroup[]>(() => {
    const groups = this.store.grouped();
    if (this.filter() === 'all') {
      return groups;
    }
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => !item.read && item.inviteState !== 'declined'),
      }))
      .filter((group) => group.items.length > 0);
  });

  protected readonly filterOptions = computed(() => {
    const total = this.store.items().length;
    const unread = this.store.unreadCount();
    return [
      {
        value: 'all',
        label: `${this.transloco.translate('notifications.page.tabs.all')} (${total})`,
      },
      {
        value: 'unread',
        label: `${this.transloco.translate('notifications.page.tabs.unread')} (${unread})`,
      },
    ];
  });

  protected emptyTitle(): string {
    return this.transloco.translate(
      this.filter() === 'unread' ? 'notifications.page.allRead' : 'notifications.empty',
    );
  }

  protected emptyDescription(): string {
    return this.transloco.translate(
      this.filter() === 'unread'
        ? 'notifications.emptyDescription'
        : 'notifications.page.emptyDescription',
    );
  }

  protected setFilter(value: string): void {
    this.filter.set(value as NotificationFilter);
  }

  protected onOpen(item: NotificationItem): void {
    void this.store.markRead(item.id);
    const view = presentNotification(item);
    void this.router.navigate([view.link], { queryParams: view.queryParams });
  }

  protected async onAccept(item: NotificationItem): Promise<void> {
    const ok = await this.store.acceptInvite(item);
    if (!ok) {
      this.toastInviteError('notifications.invite.acceptError');
    }
  }

  protected async onDecline(item: NotificationItem): Promise<void> {
    const ok = await this.store.declineInvite(item);
    if (!ok) {
      this.toastInviteError('notifications.invite.declineError');
    }
  }

  private toastInviteError(messageKey: string): void {
    this.shell.showToast(
      this.transloco.translate('notifications.invite.errorTitle'),
      this.transloco.translate(messageKey),
      'error',
    );
  }
}
