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
import { Asset, AssetService } from '../../shared/services/asset.service';
import { AuthService } from '../../shared/services/auth.service';
import { CoachingBooking, CoachingService } from '../../shared/services/coaching.service';
import { Group, GroupsService } from '../../shared/services/groups.service';
import { PermissionsService } from '../../shared/services/permissions.service';
import { FirstStep, FirstStepsComponent } from './ui/first-steps/first-steps.component';

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
    FirstStepsComponent,
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
  public assets = signal<Asset[]>([]);
  public assets$ = this.assetService.getAssets().pipe(
    tap((assets) => this.assets.set(assets)),
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
  public groups = signal<Group[]>([]);
  public groupsLoading = signal(false);
  private readonly currentUserId = computed(() => this.auth.user()?.id ?? '');
  public firstSteps = computed<FirstStep[]>(() => {
    const groups = this.groups();
    const hasGroups = groups.length > 0;
    const hasVideos = this.assets().length > 0;
    const hasUpcomingSession = this.upcomingBookings().length > 0;
    const steps: FirstStep[] = [];

    if (this.permissionsService.hasPermission('groups:read')) {
      if (this.permissionsService.hasPermission('groups:create')) {
        steps.push({
          title: hasGroups ? 'Group created' : 'Create a group',
          description: hasGroups
            ? 'Your first group is ready for students and videos.'
            : 'Create a group for the students or athletes you coach.',
          completed: hasGroups,
          icon: '@tui.users',
          actionLabel: 'Create group',
          actionRouterLink: '/create-group',
        });
        steps.push({
          title: 'Invite students',
          description: hasGroups
            ? 'Share an invitation link so students can join and submit videos.'
            : 'Create a group first, then share an invitation link.',
          completed: false,
          icon: '@tui.mail',
          actionLabel: 'Open groups',
          actionRouterLink: hasGroups ? `/groups/${groups[0].id}` : '/groups',
          disabled: !hasGroups,
        });
      } else {
        steps.push({
          title: hasGroups ? 'Group joined' : 'Join a group',
          description: hasGroups
            ? 'You can upload videos and book coaching within your group.'
            : 'Use an invitation link from your coach to join a group.',
          completed: hasGroups,
          icon: '@tui.users',
          actionLabel: hasGroups ? 'Open groups' : undefined,
          actionRouterLink: hasGroups ? '/groups' : undefined,
        });
      }
    }

    if (this.showUploadVideo()) {
      steps.push({
        title: hasVideos ? 'Video uploaded' : 'Upload your first video',
        description: hasVideos
          ? 'Your latest videos will appear on this page.'
          : 'Share a training video so an expert can review it.',
        completed: hasVideos,
        icon: '@tui.upload-cloud',
        actionLabel: 'Upload video',
        actionRouterLink: '/upload-video',
      });
    }

    if (this.canBook()) {
      steps.push({
        title: hasUpcomingSession ? 'Coaching booked' : 'Book live coaching',
        description: hasUpcomingSession
          ? 'Your upcoming sessions will appear on this page.'
          : 'Reserve a live coaching slot when your expert has availability.',
        completed: hasUpcomingSession,
        icon: '@tui.calendar',
        actionLabel: 'Book session',
        actionRouterLink: '/sessions/book',
      });
    }

    if (this.permissionsService.hasPermission('coaching:availability:manage')) {
      steps.push({
        title: 'Set coaching availability',
        description: 'Create session types and availability so students can book time with you.',
        completed: false,
        icon: '@tui.calendar-check',
        actionLabel: 'Manage availability',
        actionRouterLink: '/sessions/settings',
      });
    }

    if (this.permissionsService.hasPermission('reviews:read') && !this.showUploadVideo()) {
      steps.push({
        title: 'Review submitted videos',
        description: 'Student videos waiting for feedback will appear here when they are submitted.',
        completed: false,
        icon: '@tui.video',
        actionLabel: 'Open videos',
        actionRouterLink: '/videos',
      });
    }

    return steps;
  });
  public showFirstSteps = computed(() => {
    const homeHasContent =
      this.assets().length > 0 ||
      (this.showCoachingWidget() && this.upcomingBookings().length > 0);

    return (
      !this.loading() &&
      !this.bookingsLoading() &&
      !this.groupsLoading() &&
      !homeHasContent &&
      this.firstSteps().length > 0
    );
  });

  constructor() {
    if (this.permissionsService.hasPermission('groups:read')) {
      this.groupsLoading.set(true);
      this.groupsService.list().subscribe({
        next: (groups) => {
          this.groups.set(groups ?? []);
          this.groupsLoading.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.groupsLoading.set(false);
          this.cdr.markForCheck();
        },
      });
    }

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
