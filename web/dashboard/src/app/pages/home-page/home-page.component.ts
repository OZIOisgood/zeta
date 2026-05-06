import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TuiButton } from '@taiga-ui/core';
import { TuiSkeleton } from '@taiga-ui/kit';
import { map, tap } from 'rxjs';
import { AssetListComponent } from '../../shared/components/asset-list/asset-list.component';
import { IllustratedMessageComponent } from '../../shared/components/illustrated-message/illustrated-message.component';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { AssetService } from '../../shared/services/asset.service';
import { AuthService } from '../../shared/services/auth.service';
import { CoachingBooking, CoachingService } from '../../shared/services/coaching.service';
import { PermissionsService } from '../../shared/services/permissions.service';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PageContainerComponent,
    AssetListComponent,
    TuiButton,
    TuiSkeleton,
    SectionHeaderComponent,
    IllustratedMessageComponent,
  ],
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  public auth = inject(AuthService);
  private readonly assetService = inject(AssetService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly coachingService = inject(CoachingService);

  public loading = signal(true);
  public assets$ = this.assetService.getAssets().pipe(
    map((assets) => assets.slice(0, this.recentVideosLimit())),
    tap({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false),
    }),
  );
  public showUploadVideo = computed(() => this.permissionsService.hasPermission('assets:create'));
  public recentVideosLimit = computed(() => (this.showUploadVideo() ? 11 : 12));
  public showCoachingWidget = computed(() =>
    this.permissionsService.hasPermission('coaching:bookings:read'),
  );
  public canBook = computed(() => this.permissionsService.hasPermission('coaching:book'));
  public upcomingBookings = signal<CoachingBooking[]>([]);
  public bookingsLoading = signal(false);
  private readonly currentUserId = computed(() => this.auth.user()?.id ?? '');

  constructor() {
    if (this.permissionsService.hasPermission('coaching:bookings:read')) {
      this.bookingsLoading.set(true);
      this.coachingService.listAllMyBookings().subscribe({
        next: (bookings) => {
          const upcoming = (bookings ?? []).filter(
            (b) => b.status === 'pending' && new Date(b.scheduled_at) > new Date(),
          );
          this.upcomingBookings.set(upcoming.slice(0, 5));
          this.bookingsLoading.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.bookingsLoading.set(false);
          this.cdr.markForCheck();
        },
      });
    }
  }

  formatSessionDateTime(isoString: string): string {
    return new Date(isoString).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  canJoinSession(session: CoachingBooking): boolean {
    if (session.status === 'cancelled') return false;
    const msUntil = new Date(session.scheduled_at).getTime() - Date.now();
    const msAfterEnd =
      Date.now() -
      (new Date(session.scheduled_at).getTime() + session.duration_minutes * 60 * 1000);
    return msUntil <= 15 * 60 * 1000 && msAfterEnd <= 0;
  }

  joinSession(session: CoachingBooking): void {
    this.router.navigate(['/sessions', session.group_id, session.id, 'call']);
  }

  otherParty(session: CoachingBooking): string {
    return this.isExpertForBooking(session)
      ? session.student_name || session.student_id
      : session.expert_name || session.expert_id;
  }

  otherPartyRole(session: CoachingBooking): string {
    return this.isExpertForBooking(session) ? 'Student' : 'Expert';
  }

  onAddVideo() {
    this.router.navigate(['/upload-video']);
  }

  private isExpertForBooking(session: CoachingBooking): boolean {
    return session.expert_id === this.currentUserId();
  }
}
