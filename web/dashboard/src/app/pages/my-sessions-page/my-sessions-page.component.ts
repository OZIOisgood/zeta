import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TuiAlertService, TuiButton, TuiIcon } from '@taiga-ui/core';
import { IllustratedMessageComponent } from '../../shared/components/illustrated-message/illustrated-message.component';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { AuthService } from '../../shared/services/auth.service';
import { CoachingBooking, CoachingService } from '../../shared/services/coaching.service';
import { GroupsService } from '../../shared/services/groups.service';
import { PermissionsService } from '../../shared/services/permissions.service';

type TabKey = 'upcoming' | 'past' | 'cancelled';

@Component({
  selector: 'app-my-sessions-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageContainerComponent,
    TuiButton,
    TuiIcon,
    SectionHeaderComponent,
    IllustratedMessageComponent,
  ],
  templateUrl: './my-sessions-page.component.html',
  styleUrls: ['./my-sessions-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MySessionsPageComponent implements OnInit {
  private readonly coachingService = inject(CoachingService);
  private readonly groupsService = inject(GroupsService);
  private readonly auth = inject(AuthService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly alerts = inject(TuiAlertService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  protected loading = signal(true);
  protected allBookings = signal<CoachingBooking[]>([]);
  protected activeTab = signal<TabKey>('upcoming');

  protected canBook = computed(() => this.permissionsService.hasPermission('coaching:book'));
  protected canManageAvailability = computed(() =>
    this.permissionsService.hasPermission('coaching:availability:manage'),
  );
  protected currentUserId = computed(() => this.auth.user()?.id ?? '');

  protected upcoming = computed(() => {
    const now = new Date();
    return this.allBookings().filter(
      (b) => b.status !== 'cancelled' && new Date(b.scheduled_at) > now,
    );
  });

  protected past = computed(() => {
    const now = new Date();
    return this.allBookings().filter(
      (b) => b.status !== 'cancelled' && new Date(b.scheduled_at) <= now,
    );
  });

  protected cancelled = computed(() => this.allBookings().filter((b) => b.status === 'cancelled'));

  ngOnInit(): void {
    this.groupsService.list().subscribe({
      next: (groups) => {
        const groupIds = groups.map((g) => g.id);
        this.coachingService.listMyBookingsAllGroups(groupIds).subscribe({
          next: (bookings) => {
            this.allBookings.set(bookings ?? []);
            this.loading.set(false);
            this.cdr.markForCheck();
          },
          error: () => {
            this.loading.set(false);
            this.cdr.markForCheck();
          },
        });
      },
      error: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  protected setTab(tab: TabKey): void {
    this.activeTab.set(tab);
  }

  protected bookSession(): void {
    this.router.navigate(['/sessions/book']);
  }

  protected manageAvailability(): void {
    this.router.navigate(['/sessions/settings']);
  }

  protected formatDateTime(isoString: string): string {
    return new Date(isoString).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected canCancel(booking: CoachingBooking): boolean {
    const msTillSession = new Date(booking.scheduled_at).getTime() - Date.now();
    return booking.status !== 'cancelled' && msTillSession > 60 * 60 * 1000;
  }

  protected isExpertForBooking(booking: CoachingBooking): boolean {
    return booking.expert_id === this.currentUserId();
  }

  // Cancel dialog
  protected cancelDialogOpen = false;
  protected cancelTarget: CoachingBooking | null = null;
  protected cancelReason = '';

  protected openCancelDialog(booking: CoachingBooking): void {
    this.cancelTarget = booking;
    this.cancelReason = '';
    this.cancelDialogOpen = true;
    this.cdr.markForCheck();
  }

  protected closeCancelDialog(): void {
    this.cancelDialogOpen = false;
    this.cancelTarget = null;
    this.cdr.markForCheck();
  }

  protected confirmCancel(): void {
    if (!this.cancelTarget) return;
    this.coachingService
      .cancelBooking(
        this.cancelTarget.group_id,
        this.cancelTarget.id,
        this.cancelReason || undefined,
      )
      .subscribe({
        next: (updated) => {
          this.allBookings.update((list) => list.map((b) => (b.id === updated.id ? updated : b)));
          this.closeCancelDialog();
        },
        error: (err) => {
          const msg =
            err.status === 400
              ? 'Cancellations must be made at least 1 hour before the session.'
              : 'Failed to cancel booking.';
          this.alerts.open(msg, { appearance: 'negative' }).subscribe();
          this.closeCancelDialog();
        },
      });
  }

  protected otherParty(booking: CoachingBooking): string {
    return this.isExpertForBooking(booking)
      ? booking.student_name || booking.student_id
      : booking.expert_name || booking.expert_id;
  }

  protected otherPartyRole(booking: CoachingBooking): string {
    return this.isExpertForBooking(booking) ? 'Student' : 'Expert';
  }
}
