import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucideInbox, LucideShieldAlert } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import {
  ModerationReport,
  ModerationReportsApiClient,
} from '../../core/http/moderation-reports-api.service';
import { DashboardDateTimeService } from '../../core/i18n/dashboard-date-time.service';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZEmptyStateComponent } from '../../shared/ui/empty-state/z-empty-state.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';

type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-admin-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    ZBadgeComponent,
    ZEmptyStateComponent,
    ZSkeletonComponent,
    LucideInbox,
    LucideShieldAlert,
  ],
  template: `
    <div class="grid gap-6">
      <section class="grid gap-3 sm:grid-cols-2">
        <a
          routerLink="/admin/reports"
          class="rounded-lg border border-[var(--z-border)] bg-white p-4 shadow-sm transition hover:border-[var(--z-primary-soft)] hover:bg-[var(--z-surface-warm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)]"
        >
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-medium text-[var(--z-muted)]">
              {{ 'moderation.admin.dashboard.openReports' | transloco }}
            </p>
            <svg lucideShieldAlert class="size-4 text-[var(--z-primary)]" aria-hidden="true"></svg>
          </div>
          <p class="mt-4 text-3xl font-semibold">{{ openReportCount() }}</p>
        </a>
      </section>

      <section class="rounded-lg border border-[var(--z-border)] bg-white shadow-sm">
        <div class="flex items-center justify-between gap-3 border-b border-[var(--z-border)] p-4">
          <div>
            <h1 class="text-base font-semibold">
              {{ 'moderation.admin.dashboard.title' | transloco }}
            </h1>
            <p class="mt-1 text-sm text-[var(--z-muted)]">
              {{ 'moderation.admin.dashboard.description' | transloco }}
            </p>
          </div>
          <a routerLink="/admin/reports" class="text-sm font-semibold text-[var(--z-primary)]">
            {{ 'moderation.admin.dashboard.viewReports' | transloco }}
          </a>
        </div>

        @if (status() === 'loading') {
          <div class="space-y-3 p-4" aria-hidden="true">
            <z-skeleton class="block h-14 w-full"></z-skeleton>
            <z-skeleton class="block h-14 w-full"></z-skeleton>
            <z-skeleton class="block h-14 w-full"></z-skeleton>
          </div>
        } @else if (status() === 'error') {
          <div class="p-4">
            <z-empty-state
              [title]="'moderation.admin.errorTitle' | transloco"
              [description]="'moderation.admin.errorDescription' | transloco"
            />
          </div>
        } @else if (recentReports().length === 0) {
          <div class="p-4">
            <z-empty-state
              [title]="'moderation.admin.dashboard.emptyTitle' | transloco"
              [description]="'moderation.admin.dashboard.emptyDescription' | transloco"
            />
          </div>
        } @else {
          <div class="divide-y divide-[var(--z-border)]">
            @for (report of recentReports(); track report.id) {
              <a
                routerLink="/admin/reports"
                class="grid gap-3 p-4 transition hover:bg-[var(--z-surface-warm)] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
              >
                <span class="rounded-md bg-[var(--z-surface-warm)] p-2 text-[var(--z-primary)]">
                  <svg lucideInbox class="size-4" aria-hidden="true"></svg>
                </span>
                <span class="min-w-0">
                  <span class="block truncate text-sm font-semibold">
                    {{ subjectLabel(report) }}
                  </span>
                  <span class="mt-1 block truncate text-sm text-[var(--z-muted)]">
                    {{ report.target_display_name || ('moderation.admin.unknown' | transloco) }}
                    · {{ formatDate(report.created_at) }}
                  </span>
                </span>
                <z-badge [tone]="statusTone(report.status)">
                  {{ statusLabel(report.status) }}
                </z-badge>
              </a>
            }
          </div>
        }
      </section>
    </div>
  `,
})
export class AdminPageComponent {
  private readonly api = inject(ModerationReportsApiClient);
  private readonly dateTime = inject(DashboardDateTimeService);
  private readonly transloco = inject(TranslocoService);

  protected readonly status = signal<AsyncStatus>('idle');
  protected readonly reports = signal<ModerationReport[]>([]);
  protected readonly openReportCount = computed(
    () => this.reports().filter((report) => report.status === 'open').length,
  );
  protected readonly recentReports = computed(() => this.reports().slice(0, 5));

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.status.set('loading');
    try {
      const reports = await firstValueFrom(this.api.list());
      this.reports.set(reports);
      this.status.set('success');
    } catch {
      this.status.set('error');
    }
  }

  protected formatDate(value: string): string {
    return this.dateTime.formatInstantDateTime(value, { dateStyle: 'medium', timeStyle: 'short' });
  }

  protected subjectLabel(report: ModerationReport): string {
    return this.transloco.translate(
      `moderation.report.subject.${
        report.subject_type === 'review_comment' ? 'reviewComment' : 'user'
      }`,
    );
  }

  protected statusLabel(value: ModerationReport['status']): string {
    return this.transloco.translate(`moderation.admin.statuses.${value}`);
  }

  protected statusTone(value: ModerationReport['status']): 'primary' | 'success' | 'danger' {
    if (value === 'resolved') return 'success';
    if (value === 'rejected') return 'danger';
    return 'primary';
  }
}
