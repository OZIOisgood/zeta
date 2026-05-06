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
import { Router } from '@angular/router';
import { TuiAlertService, TuiButton, TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { TuiSkeleton } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { IllustratedMessageComponent } from '../../shared/components/illustrated-message/illustrated-message.component';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { AuthService } from '../../shared/services/auth.service';
import { CoachingBooking, CoachingService } from '../../shared/services/coaching.service';
import { PermissionsService } from '../../shared/services/permissions.service';
import {
  CancelSessionDialogComponent,
  CancelSessionDialogResult,
} from './ui/cancel-session-dialog/cancel-session-dialog.component';

type TabKey = 'upcoming' | 'past' | 'cancelled';

@Component({
  selector: 'app-my-sessions-page',
  standalone: true,
  imports: [
    CommonModule,
    PageContainerComponent,
    TuiButton,
    TuiIcon,
    TuiSkeleton,
    SectionHeaderComponent,
    IllustratedMessageComponent,
  ],
  templateUrl: './my-sessions-page.component.html',
  styleUrls: ['./my-sessions-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MySessionsPageComponent implements OnInit {
  private readonly coachingService = inject(CoachingService);
  private readonly auth = inject(AuthService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly alerts = inject(TuiAlertService);
  private readonly dialogs = inject(TuiDialogService);
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
    this.coachingService.listAllMyBookings().subscribe({
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

  protected openCancelDialog(booking: CoachingBooking): void {
    this.dialogs
      .open<CancelSessionDialogResult | null>(
        new PolymorpheusComponent(CancelSessionDialogComponent),
        {
          label: 'Cancel Session',
          size: 's',
          data: {
            otherParty: this.otherParty(booking),
            scheduledAt: this.formatDateTime(booking.scheduled_at),
          },
        },
      )
      .subscribe((result) => {
        if (!result) return;

        this.coachingService
          .cancelBooking(booking.group_id, booking.id, result.cancellation_reason)
          .subscribe({
            next: (updated) => {
              this.allBookings.update((list) =>
                list.map((b) => (b.id === updated.id ? updated : b)),
              );
            },
            error: (err) => {
              const msg =
                err.status === 400
                  ? 'Cancellations must be made at least 1 hour before the session.'
                  : 'Failed to cancel booking.';
              this.alerts.open(msg, { appearance: 'negative' }).subscribe();
            },
          });
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

  protected canJoin(booking: CoachingBooking): boolean {
    if (booking.status === 'cancelled') return false;
    const msUntil = new Date(booking.scheduled_at).getTime() - Date.now();
    const msAfterEnd =
      Date.now() -
      (new Date(booking.scheduled_at).getTime() + booking.duration_minutes * 60 * 1000);
    // 15 min before → end of session
    return msUntil <= 15 * 60 * 1000 && msAfterEnd <= 0;
  }

  protected joinSession(booking: CoachingBooking): void {
    this.router.navigate(['/sessions', booking.group_id, booking.id, 'call']);
  }

  protected recordingReady(booking: CoachingBooking): boolean {
    return booking.recording?.status === 'ready' && !!booking.recording.asset_id;
  }

  protected recordingStatusLabel(booking: CoachingBooking): string {
    switch (booking.recording?.status) {
      case 'ready':
        return 'recording ready';
      case 'failed':
        return 'recording failed';
      case 'pending':
      case 'importing':
      case 'processing':
        return 'recording processing';
      case 'starting':
      case 'started':
      case 'stopping':
      case 'stopped':
        return 'recording captured';
      default:
        return 'recording';
    }
  }

  protected recordingStatusClass(booking: CoachingBooking): string {
    switch (booking.recording?.status) {
      case 'ready':
        return 'status-badge--recording-ready';
      case 'failed':
        return 'status-badge--recording-failed';
      default:
        return 'status-badge--recording-processing';
    }
  }

  protected openRecording(booking: CoachingBooking): void {
    if (!booking.recording?.asset_id) return;
    this.router.navigate(['/asset', booking.recording.asset_id]);
  }
}
