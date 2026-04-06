import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { TuiButton } from '@taiga-ui/core';
import { TuiBadge, TuiSkeleton, TuiTabs } from '@taiga-ui/kit';
import { TuiBlockStatus } from '@taiga-ui/layout';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import { AuthService } from '../../shared/services/auth.service';
import { CoachingService, CoachingSession } from '../../shared/services/coaching.service';
import { PermissionsService } from '../../shared/services/permissions.service';

@Component({
  selector: 'app-coaching-sessions-page',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    PageContainerComponent,
    TuiTabs,
    TuiBadge,
    TuiButton,
    TuiSkeleton,
    TuiBlockStatus,
  ],
  templateUrl: './coaching-sessions-page.component.html',
  styleUrls: ['./coaching-sessions-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoachingSessionsPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly coachingService = inject(CoachingService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly sessions = signal<CoachingSession[]>([]);
  protected readonly activeTab = signal(0);

  protected readonly canCreate = computed(() =>
    this.permissionsService.hasPermission('coaching:create'),
  );

  protected readonly userRole = computed(() => this.auth.user()?.role);
  protected readonly userId = computed(() => this.auth.user()?.id);

  protected readonly upcomingSessions = computed(() => {
    const now = new Date();
    return this.sessions()
      .filter((s) => new Date(s.scheduled_at) >= now && s.status !== 'cancelled')
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  });

  protected readonly pastSessions = computed(() => {
    const now = new Date();
    return this.sessions()
      .filter(
        (s) =>
          new Date(s.scheduled_at).getTime() + s.duration_minutes * 60000 < now.getTime() ||
          s.status === 'cancelled',
      )
      .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
  });

  ngOnInit(): void {
    this.coachingService.getSessions().subscribe({
      next: (sessions) => {
        this.sessions.set(sessions);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected onCreateSession(): void {
    this.router.navigate(['/coaching/create']);
  }

  protected onJoin(session: CoachingSession): void {
    this.router.navigate(['/coaching', session.id, 'call']);
  }

  protected isJoinable(session: CoachingSession): boolean {
    if (session.status === 'cancelled' || session.status === 'completed') return false;
    const now = Date.now();
    const start = new Date(session.scheduled_at).getTime();
    const end = start + session.duration_minutes * 60000;
    const windowStart = start - 15 * 60000;
    return now >= windowStart && now <= end;
  }

  protected getPartnerName(session: CoachingSession): string {
    const userId = this.userId();
    if (session.student_id === userId) return session.expert_id;
    return session.student_id;
  }

  protected getStatusAppearance(
    status: string,
  ): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
    switch (status) {
      case 'scheduled':
        return 'info';
      case 'in_progress':
        return 'warning';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'neutral';
    }
  }

  protected formatStatus(status: string): string {
    return status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  protected onCancel(session: CoachingSession): void {
    this.coachingService.cancelSession(session.id).subscribe(() => {
      this.sessions.update((sessions) =>
        sessions.map((s) => (s.id === session.id ? { ...s, status: 'cancelled' as const } : s)),
      );
    });
  }
}
