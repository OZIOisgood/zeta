import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TuiButton } from '@taiga-ui/core';
import { AuthService } from '../../services/auth.service';
import { CoachingService, CoachingSession } from '../../services/coaching.service';

@Component({
  selector: 'app-coaching-widget',
  standalone: true,
  imports: [CommonModule, DatePipe, TuiButton],
  templateUrl: './coaching-widget.component.html',
  styleUrls: ['./coaching-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoachingWidgetComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly coachingService = inject(CoachingService);
  private readonly auth = inject(AuthService);

  protected readonly sessions = signal<CoachingSession[]>([]);
  protected readonly loading = signal(true);

  ngOnInit(): void {
    this.coachingService.getSessions().subscribe({
      next: (sessions) => {
        const now = new Date();
        const upcoming = sessions
          .filter((s) => new Date(s.scheduled_at) >= now && s.status !== 'cancelled')
          .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
          .slice(0, 3);
        this.sessions.set(upcoming);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected isJoinable(session: CoachingSession): boolean {
    const now = Date.now();
    const start = new Date(session.scheduled_at).getTime();
    const end = start + session.duration_minutes * 60000;
    return now >= start - 15 * 60000 && now <= end;
  }

  protected getPartnerName(session: CoachingSession): string {
    const userId = this.auth.user()?.id;
    return session.student_id === userId ? session.expert_id : session.student_id;
  }

  protected onJoin(session: CoachingSession): void {
    this.router.navigate(['/coaching', session.id, 'call']);
  }

  protected onViewAll(): void {
    this.router.navigate(['/coaching']);
  }
}
