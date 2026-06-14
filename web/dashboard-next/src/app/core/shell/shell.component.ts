import { NgClass } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  LucideBell,
  LucideCalendarDays,
  LucideChartColumn,
  LucideCheckCheck,
  LucideChevronRight,
  LucideHome,
  LucideLogOut,
  LucideMenu,
  LucideSettings,
  LucideTicket,
  LucideUserRound,
  LucideUsers,
  LucideVideo,
  LucideX,
} from '@lucide/angular';
import { filter } from 'rxjs';
import { NotificationItem } from '../../core/http/notifications-api.service';
import { NotificationListComponent } from '../../features/notifications/notification-list.component';
import {
  NotificationPresentation,
  presentNotification,
} from '../../features/notifications/notification-presenter';
import { NotificationsStore } from '../../features/notifications/notifications.store';
import { SessionStore } from '../../features/session/session.store';
import { ZAvatarComponent } from '../../shared/ui/avatar/z-avatar.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZIconButtonComponent } from '../../shared/ui/icon-button/z-icon-button.component';
import { ZToastComponent } from '../../shared/ui/toast/z-toast.component';
import { DashboardLocalizationService } from '../i18n/dashboard-localization.service';
import { PermissionsService } from '../permissions/permissions.service';
import { AppShellStore } from '../state/app-shell.store';

@Component({
  selector: 'app-shell',
  imports: [
    NgClass,
    RouterLink,
    RouterOutlet,
    TranslocoPipe,
    ZAvatarComponent,
    ZButtonComponent,
    ZIconButtonComponent,
    ZToastComponent,
    NotificationListComponent,
    LucideBell,
    LucideCalendarDays,
    LucideChartColumn,
    LucideCheckCheck,
    LucideChevronRight,
    LucideHome,
    LucideLogOut,
    LucideMenu,
    LucideSettings,
    LucideTicket,
    LucideUserRound,
    LucideUsers,
    LucideVideo,
    LucideX,
  ],
  templateUrl: './shell.html',
})
export class ShellComponent implements OnDestroy {
  protected readonly shell = inject(AppShellStore);
  protected readonly session = inject(SessionStore);
  protected readonly notifications = inject(NotificationsStore);
  private readonly permissions = inject(PermissionsService);
  private readonly userMenu = viewChild<ElementRef<HTMLElement>>('userMenu');
  private readonly notificationMenu = viewChild<ElementRef<HTMLElement>>('notificationMenu');
  private readonly bump = signal(false);
  protected readonly badgeBump = this.bump.asReadonly();
  private bumpTimer: ReturnType<typeof setTimeout> | null = null;
  protected readonly navigation = computed(() =>
    this.shell.navigation().filter((item) => {
      if (item.id === 'groups') {
        return this.permissions.hasPermission('groups:read');
      }

      if (item.id === 'sessions') {
        return this.permissions.hasPermission('coaching:bookings:read');
      }

      if (item.id === 'reports-expert') {
        return (
          this.permissions.hasPermission('reports:read') && this.session.user()?.role !== 'student'
        );
      }

      if (item.id === 'reports-student') {
        return (
          this.permissions.hasPermission('reports:read') && this.session.user()?.role === 'student'
        );
      }

      if (item.id === 'invite-codes') {
        const role = this.session.user()?.role;
        return role === 'expert' || role === 'admin';
      }

      return true;
    }),
  );
  protected readonly initials = computed(() => {
    return this.session
      .displayName()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  });
  private readonly localization = inject(DashboardLocalizationService);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      this.shell.setLanguage(this.localization.currentLanguage());
    });
    this.shell.selectSectionForUrl(this.router.url);

    // The shell only renders for authenticated users, so this is the right place
    // to load notifications and open the live SSE stream.
    void this.notifications.load();
    this.notifications.connect();

    // Pop the bell badge whenever a live event raises the unread count. The
    // write is deferred so it never runs inside the effect's reactive context.
    effect(() => {
      const arrived = this.notifications.lastArrivedId();
      if (arrived) {
        setTimeout(() => this.triggerBadgeBump());
      }
    });

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.shell.selectSectionForUrl(event.urlAfterRedirects);
        this.shell.closeUserMenu();
        this.shell.closeNotifications();
      });
  }

  ngOnDestroy(): void {
    this.notifications.disconnect();
  }

  protected present(item: NotificationItem): NotificationPresentation {
    return presentNotification(item);
  }

  protected onNotificationClick(item: NotificationItem): void {
    void this.notifications.markRead(item.id);
    this.shell.closeNotifications();
  }

  protected async onAcceptInvite(item: NotificationItem): Promise<void> {
    const ok = await this.notifications.acceptInvite(item);
    if (!ok) {
      this.toastInviteError('notifications.invite.acceptError');
    }
  }

  protected async onDeclineInvite(item: NotificationItem): Promise<void> {
    const ok = await this.notifications.declineInvite(item);
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

  private triggerBadgeBump(): void {
    this.bump.set(true);
    if (this.bumpTimer) {
      clearTimeout(this.bumpTimer);
    }
    this.bumpTimer = setTimeout(() => this.bump.set(false), 450);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (!target) return;

    if (this.shell.isUserMenuOpen()) {
      const menu = this.userMenu()?.nativeElement;
      if (menu && !menu.contains(target)) {
        this.shell.closeUserMenu();
      }
    }

    if (this.shell.isNotificationsOpen()) {
      const menu = this.notificationMenu()?.nativeElement;
      if (menu && !menu.contains(target)) {
        this.shell.closeNotifications();
      }
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.shell.closeUserMenu();
    this.shell.closeNotifications();
  }
}
