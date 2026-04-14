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
import { tap } from 'rxjs';
import { AssetListComponent } from '../../shared/components/asset-list/asset-list.component';
import { IllustratedMessageComponent } from '../../shared/components/illustrated-message/illustrated-message.component';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { AssetService } from '../../shared/services/asset.service';
import { AuthService } from '../../shared/services/auth.service';
import { CoachingBooking, CoachingService } from '../../shared/services/coaching.service';
import { GroupsService } from '../../shared/services/groups.service';
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
  private readonly groupsService = inject(GroupsService);

  public loading = signal(true);
  public assets$ = this.assetService.getAssets().pipe(tap(() => this.loading.set(false)));
  public showUploadVideo = computed(() => this.permissionsService.hasPermission('assets:create'));
  public showCoachingWidget = computed(() =>
    this.permissionsService.hasPermission('coaching:bookings:read'),
  );
  public canBook = computed(() => this.permissionsService.hasPermission('coaching:book'));
  public upcomingBookings = signal<CoachingBooking[]>([]);
  public bookingsLoading = signal(false);

  constructor() {
    if (this.permissionsService.hasPermission('coaching:bookings:read')) {
      this.bookingsLoading.set(true);
      this.groupsService.list().subscribe({
        next: (groups) => {
          const groupIds = groups.map((g) => g.id);
          this.coachingService.listMyBookingsAllGroups(groupIds).subscribe({
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

  onAddVideo() {
    this.router.navigate(['/upload-video']);
  }
}
