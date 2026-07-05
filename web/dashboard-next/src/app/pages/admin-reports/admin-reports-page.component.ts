import { Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucideShieldAlert } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import {
  ModerationReport,
  ModerationReportStatus,
  ModerationReportSubjectType,
  ModerationReportsApiClient,
} from '../../core/http/moderation-reports-api.service';
import { DashboardDateTimeService } from '../../core/i18n/dashboard-date-time.service';
import { AppShellStore } from '../../core/state/app-shell.store';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZEmptyStateComponent } from '../../shared/ui/empty-state/z-empty-state.component';
import { SelectOption, ZSelectComponent } from '../../shared/ui/select/z-select.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';

type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-admin-reports-page',
  imports: [
    TranslocoPipe,
    ZBadgeComponent,
    ZEmptyStateComponent,
    ZSelectComponent,
    ZSkeletonComponent,
    LucideShieldAlert,
  ],
  template: `
    <div class="grid gap-5">
      <section class="border-b border-[var(--z-border)] pb-4">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <svg lucideShieldAlert class="size-5 text-[var(--z-primary)]" aria-hidden="true"></svg>
            <h1 class="text-xl font-semibold leading-tight">
              {{ 'moderation.admin.title' | transloco }}
            </h1>
          </div>
          <p class="mt-1 text-sm leading-6 text-[var(--z-muted)]">
            {{ 'moderation.admin.description' | transloco }}
          </p>
        </div>
      </section>

      <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-[16rem_16rem]">
        <label class="grid gap-1.5">
          <span class="text-sm font-semibold">{{
            'moderation.admin.filters.status' | transloco
          }}</span>
          <z-select
            [value]="statusFilter()"
            [options]="statusFilterOptions()"
            (valueChange)="setStatusFilter($event)"
          />
        </label>
        <label class="grid gap-1.5">
          <span class="text-sm font-semibold">{{
            'moderation.admin.filters.subject' | transloco
          }}</span>
          <z-select
            [value]="subjectFilter()"
            [options]="subjectFilterOptions()"
            (valueChange)="setSubjectFilter($event)"
          />
        </label>
      </section>

      @if (status() === 'loading') {
        <div class="grid gap-3" aria-hidden="true">
          <z-skeleton class="block h-36 w-full"></z-skeleton>
          <z-skeleton class="block h-36 w-full"></z-skeleton>
          <z-skeleton class="block h-36 w-full"></z-skeleton>
        </div>
      } @else if (status() === 'error') {
        <z-empty-state
          [title]="'moderation.admin.errorTitle' | transloco"
          [description]="'moderation.admin.errorDescription' | transloco"
        />
      } @else if (reports().length === 0) {
        <z-empty-state
          [title]="'moderation.admin.emptyTitle' | transloco"
          [description]="'moderation.admin.emptyDescription' | transloco"
        />
      } @else {
        <div class="grid gap-3">
          @for (report of reports(); track report.id) {
            <article class="rounded-lg border border-[var(--z-border)] bg-white p-4 shadow-sm">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <z-badge [tone]="statusTone(report.status)">
                      {{ statusLabel(report.status) }}
                    </z-badge>
                    <z-badge>{{ reasonLabel(report.reason) }}</z-badge>
                    <span class="text-xs font-semibold text-[var(--z-muted)]">
                      {{ formatDate(report.created_at) }}
                    </span>
                  </div>
                  <h2 class="mt-2 text-base font-semibold leading-tight">
                    {{ subjectLabel(report.subject_type) }}
                    @if (report.target_display_name) {
                      <span class="text-[var(--z-muted)]">· {{ report.target_display_name }}</span>
                    }
                  </h2>
                </div>
                @if (report.status === 'open') {
                  <label class="grid min-w-40 gap-1.5">
                    <span class="text-sm font-semibold">{{
                      'moderation.admin.status' | transloco
                    }}</span>
                    <z-select
                      [value]="report.status"
                      [options]="statusOptions()"
                      [disabled]="updatingId() === report.id"
                      (valueChange)="changeStatus(report, $event)"
                    />
                  </label>
                }
              </div>

              <dl class="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <dt class="font-semibold text-[var(--z-muted)]">
                    {{ 'moderation.admin.reporter' | transloco }}
                  </dt>
                  <dd class="mt-1 break-all">
                    {{ report.reporter_display_name }} · {{ report.reporter_user_id }}
                  </dd>
                </div>
                <div>
                  <dt class="font-semibold text-[var(--z-muted)]">
                    {{ 'moderation.admin.target' | transloco }}
                  </dt>
                  <dd class="mt-1 break-all">
                    {{ report.target_display_name || ('moderation.admin.unknown' | transloco) }}
                    @if (report.target_user_id) {
                      · {{ report.target_user_id }}
                    }
                  </dd>
                </div>
                <div>
                  <dt class="font-semibold text-[var(--z-muted)]">
                    {{ 'moderation.admin.videoId' | transloco }}
                  </dt>
                  <dd class="mt-1 break-all">{{ report.target_video_id || '-' }}</dd>
                </div>
                <div>
                  <dt class="font-semibold text-[var(--z-muted)]">
                    {{ 'moderation.admin.commentId' | transloco }}
                  </dt>
                  <dd class="mt-1 break-all">{{ report.target_review_id || '-' }}</dd>
                </div>
              </dl>

              <div class="mt-4 grid gap-2">
                <p class="text-sm font-semibold text-[var(--z-muted)]">
                  {{ 'moderation.admin.reportedComment' | transloco }}
                </p>
                <p
                  class="whitespace-pre-wrap rounded-md bg-[var(--z-surface-warm)] p-3 text-sm leading-6"
                >
                  {{
                    report.target_review_content ||
                      ('moderation.admin.noReportedComment' | transloco)
                  }}
                </p>
              </div>

              <div class="mt-4 grid gap-2">
                <p class="text-sm font-semibold text-[var(--z-muted)]">
                  {{ 'moderation.admin.reporterDetails' | transloco }}
                </p>
                <p
                  class="whitespace-pre-wrap rounded-md bg-[var(--z-surface-warm)] p-3 text-sm leading-6"
                >
                  {{ report.details || ('moderation.admin.noDetails' | transloco) }}
                </p>
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
})
export class AdminReportsPageComponent {
  private readonly api = inject(ModerationReportsApiClient);
  private readonly dateTime = inject(DashboardDateTimeService);
  private readonly transloco = inject(TranslocoService);
  private readonly shell = inject(AppShellStore);

  protected readonly status = signal<AsyncStatus>('idle');
  protected readonly reports = signal<ModerationReport[]>([]);
  protected readonly statusFilter = signal<ModerationReportStatus | ''>('');
  protected readonly subjectFilter = signal<ModerationReportSubjectType | ''>('');
  protected readonly updatingId = signal<string | null>(null);

  protected readonly statusOptions = computed<SelectOption[]>(() => [
    { value: 'open', label: this.statusLabel('open') },
    { value: 'resolved', label: this.statusLabel('resolved') },
    { value: 'rejected', label: this.statusLabel('rejected') },
  ]);
  protected readonly statusFilterOptions = computed<SelectOption[]>(() => [
    { value: '', label: this.transloco.translate('moderation.admin.filters.allStatuses') },
    ...this.statusOptions(),
  ]);
  protected readonly subjectFilterOptions = computed<SelectOption[]>(() => [
    { value: '', label: this.transloco.translate('moderation.admin.filters.allSubjects') },
    {
      value: 'review_comment',
      label: this.transloco.translate('moderation.report.subject.reviewComment'),
    },
    { value: 'user', label: this.transloco.translate('moderation.report.subject.user') },
  ]);

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.status.set('loading');
    try {
      const reports = await firstValueFrom(
        this.api.list({
          status: this.statusFilter(),
          subject_type: this.subjectFilter(),
        }),
      );
      this.reports.set(reports);
      this.status.set('success');
    } catch {
      this.status.set('error');
    }
  }

  protected setStatusFilter(value: string): void {
    if (value === '' || this.isStatus(value)) {
      this.statusFilter.set(value);
      void this.load();
    }
  }

  protected setSubjectFilter(value: string): void {
    if (value === '' || value === 'review_comment' || value === 'user') {
      this.subjectFilter.set(value);
      void this.load();
    }
  }

  protected async changeStatus(report: ModerationReport, value: string): Promise<void> {
    if (report.status !== 'open' || (value !== 'resolved' && value !== 'rejected')) return;
    this.updatingId.set(report.id);
    try {
      const updated = await firstValueFrom(this.api.updateStatus(report.id, value));
      this.reports.update((reports) =>
        reports.map((item) => (item.id === updated.id ? updated : item)),
      );
      this.shell.showToast(
        this.transloco.translate('moderation.admin.toast.savedTitle'),
        this.transloco.translate('moderation.admin.toast.savedMessage'),
        'success',
      );
    } catch {
      this.shell.showToast(
        this.transloco.translate('moderation.admin.toast.errorTitle'),
        this.transloco.translate('moderation.admin.toast.errorMessage'),
        'error',
      );
    } finally {
      this.updatingId.set(null);
    }
  }

  protected formatDate(value: string): string {
    return this.dateTime.formatInstantDateTime(value, { dateStyle: 'medium', timeStyle: 'short' });
  }

  protected subjectLabel(value: ModerationReportSubjectType): string {
    return this.transloco.translate(
      `moderation.report.subject.${value === 'review_comment' ? 'reviewComment' : 'user'}`,
    );
  }

  protected reasonLabel(value: string): string {
    const key = value === 'inappropriate_content' ? 'inappropriateContent' : value;
    return this.transloco.translate(`moderation.report.reason.${key}`);
  }

  protected statusLabel(value: ModerationReportStatus): string {
    return this.transloco.translate(`moderation.admin.statuses.${value}`);
  }

  protected statusTone(value: ModerationReportStatus): 'primary' | 'success' | 'danger' {
    if (value === 'resolved') return 'success';
    if (value === 'rejected') return 'danger';
    return 'primary';
  }

  private isStatus(value: string): value is ModerationReportStatus {
    return value === 'open' || value === 'resolved' || value === 'rejected';
  }
}
