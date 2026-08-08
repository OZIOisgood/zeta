import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  LucideCalendarClock,
  LucideExternalLink,
  LucideSettings,
  LucideVideo,
  LucideX,
} from '@lucide/angular';
import { NgpDialogTrigger } from 'ng-primitives/dialog';
import { CoachingBooking } from '../../core/http/coaching-api.service';
import { DashboardDateTimeService } from '../../core/i18n/dashboard-date-time.service';
import { SessionStore } from '../../features/session/session.store';
import { SessionsOverviewStore } from '../../features/sessions/sessions-overview.store';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZActionDialogComponent } from '../../shared/ui/dialog/z-action-dialog.component';
import { ZEmptyStateComponent } from '../../shared/ui/empty-state/z-empty-state.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';
import { ZTabPanelComponent } from '../../shared/ui/tabs/z-tab-panel.component';
import { ZTabsComponent } from '../../shared/ui/tabs/z-tabs.component';
import { ZTextareaComponent } from '../../shared/ui/textarea/z-textarea.component';

type SessionTab = 'upcoming' | 'past' | 'cancelled';

@Component({
  selector: 'app-sessions-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslocoPipe,
    NgpDialogTrigger,
    ZBadgeComponent,
    ZButtonComponent,
    ZActionDialogComponent,
    ZEmptyStateComponent,
    ZSkeletonComponent,
    ZTabPanelComponent,
    ZTabsComponent,
    ZTextareaComponent,
    LucideCalendarClock,
    LucideExternalLink,
    LucideSettings,
    LucideVideo,
    LucideX,
  ],
  template: `
    <div class="grid gap-6">
      <section
        class="grid gap-4 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
      >
        <div>
          <h1 class="text-2xl font-semibold sm:text-3xl">{{ 'sessions.title' | transloco }}</h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-[var(--z-muted)]">
            {{ 'sessions.summary' | transloco }}
          </p>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap md:justify-end">
          @if (canBook()) {
            <a
              routerLink="/sessions/book"
              class="inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border border-[var(--z-primary)] bg-[var(--z-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--z-primary-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)] sm:w-auto"
            >
              <svg lucideCalendarClock class="size-4" aria-hidden="true"></svg>
              <span>{{ 'sessions.bookLive' | transloco }}</span>
            </a>
          }
          @if (canManageAvailability()) {
            <a
              routerLink="/sessions/settings"
              class="inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border border-[var(--z-border)] bg-white px-4 text-sm font-semibold text-[var(--z-text)] transition hover:bg-[var(--z-surface-warm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)] sm:w-auto"
            >
              <svg lucideSettings class="size-4" aria-hidden="true"></svg>
              <span>{{ 'sessions.availability.title' | transloco }}</span>
            </a>
          }
        </div>
      </section>

      <z-tabs
        tabsId="sessions-tabs"
        [label]="'sessions.title' | transloco"
        [value]="activeTab()"
        [options]="tabOptions()"
        (valueChange)="setTab($event)"
      />

      <z-tab-panel tabsId="sessions-tabs" [value]="activeTab()">
        @if (store.status() === 'loading') {
          <div class="grid gap-3" aria-hidden="true">
            <z-skeleton class="block h-32 w-full"></z-skeleton>
            <z-skeleton class="block h-32 w-full"></z-skeleton>
          </div>
        } @else if (store.status() === 'error') {
          <z-empty-state
            [title]="'home.error.title' | transloco"
            [description]="store.error() || ('home.error.description' | transloco)"
          />
        } @else {
          @if (visibleBookings().length === 0) {
            <z-empty-state [title]="emptyTitle()" [description]="emptyDescription()" />
          } @else {
            <div
              class="overflow-hidden rounded-lg border border-[var(--z-border)] bg-white shadow-sm"
            >
              <div
                class="hidden border-b border-[var(--z-border)] bg-[var(--z-surface-warm)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--z-muted)] md:grid md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)_7rem] md:gap-4"
                aria-hidden="true"
              >
                <span>{{ 'sessions.columns.session' | transloco }}</span>
                <span>{{ 'sessions.columns.participant' | transloco }}</span>
                <span>{{ 'sessions.columns.status' | transloco }}</span>
                <span class="text-right">{{ 'sessions.columns.actions' | transloco }}</span>
              </div>
              <div class="divide-y divide-[var(--z-border)]">
                @for (booking of visibleBookings(); track booking.id) {
                  <article
                    class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-3 p-4 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)_7rem] md:items-center md:gap-4"
                  >
                    <div class="col-span-2 min-w-0 md:col-span-1">
                      <h2 class="truncate text-base font-semibold">
                        {{ booking.session_type_name || ('sessions.book.sessionType' | transloco) }}
                      </h2>
                      <p class="mt-1 text-sm leading-5 text-[var(--z-muted)]">
                        {{ formatDateTime(booking.scheduled_at) }}
                        · {{ booking.duration_minutes }} min
                      </p>
                    </div>

                    <div class="col-span-2 min-w-0 md:col-span-1">
                      <p class="truncate text-sm text-[var(--z-text)]">
                        <span class="font-medium text-[var(--z-muted)] md:hidden"
                          >{{ otherPartyRole(booking) }}:&nbsp;</span
                        >
                        {{ otherParty(booking) }}
                      </p>
                    </div>

                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <z-badge [tone]="booking.status === 'cancelled' ? 'danger' : 'primary'">
                          {{ statusLabel(booking) }}
                        </z-badge>
                        @if (booking.recording) {
                          <z-badge
                            [tone]="booking.recording.status === 'ready' ? 'success' : 'primary'"
                          >
                            {{ recordingStatusLabel(booking) }}
                          </z-badge>
                        }
                      </div>
                      @if (booking.cancellation_reason) {
                        <p class="mt-1 text-xs leading-5 text-rose-700">
                          {{
                            'common.labels.reason'
                              | transloco: { reason: booking.cancellation_reason }
                          }}
                        </p>
                      }
                    </div>

                    <div class="flex flex-wrap gap-2 md:justify-end">
                      @if (canJoin(booking)) {
                        <a
                          [routerLink]="['/sessions', booking.group_id, booking.id, 'call']"
                          class="inline-flex min-h-10 w-24 items-center justify-center gap-2 rounded-md border border-[var(--z-primary)] bg-[var(--z-primary)] px-3 text-sm font-semibold text-white transition hover:bg-[var(--z-primary-strong)]"
                        >
                          <svg lucideVideo class="size-4" aria-hidden="true"></svg>
                          <span>{{ 'common.actions.join' | transloco }}</span>
                        </a>
                      }
                      @if (recordingReady(booking)) {
                        <a
                          [routerLink]="['/asset', booking.recording?.asset_id]"
                          class="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--z-border)] bg-white px-3 text-sm font-semibold text-[var(--z-text)] transition hover:bg-[var(--z-surface-warm)]"
                        >
                          <svg lucideExternalLink class="size-4" aria-hidden="true"></svg>
                          <span>{{ 'common.actions.watch' | transloco }}</span>
                        </a>
                      }
                      @if (canCancel(booking)) {
                        <ng-template #cancelDialog let-close="close">
                          <z-action-dialog
                            [title]="'sessions.cancel.title' | transloco"
                            [description]="cancelDescription(booking)"
                            tone="danger"
                            [confirmLabel]="'sessions.cancel.title' | transloco"
                            [cancelLabel]="'sessions.cancel.keep' | transloco"
                            [confirmDisabled]="store.mutationStatus() === 'loading'"
                            [confirmResult]="cancelReasonControl.value.trim() || true"
                            [cancelResult]="null"
                            [close]="close"
                          >
                            <z-textarea
                              class="mt-4 block"
                              [formControl]="cancelReasonControl"
                              [placeholder]="'sessions.cancel.placeholder' | transloco"
                              [rows]="3"
                            />
                          </z-action-dialog>
                        </ng-template>
                        <z-button
                          class="inline-block w-24 [&_button]:min-h-10"
                          size="sm"
                          variant="secondary"
                          [fullWidth]="true"
                          [ngpDialogTrigger]="cancelDialog"
                          (pressed)="cancelReasonControl.reset('')"
                          (ngpDialogTriggerClosed)="confirmCancel($event, booking)"
                        >
                          <svg lucideX class="size-4" aria-hidden="true"></svg>
                          <span>{{ 'common.actions.cancel' | transloco }}</span>
                        </z-button>
                      }
                    </div>
                  </article>
                }
              </div>
            </div>
          }
        }
      </z-tab-panel>
    </div>
  `,
})
export class SessionsPageComponent {
  protected readonly store = inject(SessionsOverviewStore);
  private readonly session = inject(SessionStore);
  private readonly dateTime = inject(DashboardDateTimeService);
  private readonly transloco = inject(TranslocoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tabLabels = toSignal(
    this.transloco.selectTranslateObject<Record<SessionTab, string>>('sessions.tabs'),
    { initialValue: { upcoming: '', past: '', cancelled: '' } },
  );
  private readonly emptyLabels = toSignal(
    this.transloco.selectTranslateObject<
      Record<
        | 'upcomingHeading'
        | 'upcomingDescription'
        | 'pastHeading'
        | 'pastDescription'
        | 'cancelledHeading'
        | 'cancelledDescription',
        string
      >
    >('sessions.empty'),
    {
      initialValue: {
        upcomingHeading: '',
        upcomingDescription: '',
        pastHeading: '',
        pastDescription: '',
        cancelledHeading: '',
        cancelledDescription: '',
      },
    },
  );

  protected readonly cancelReasonControl = new FormControl('', { nonNullable: true });
  protected readonly activeTab = signal<SessionTab>('upcoming');
  protected readonly canBook = computed(() => this.session.hasPermission('coaching:book'));
  protected readonly canManageAvailability = computed(() =>
    this.session.hasPermission('coaching:availability:manage'),
  );
  protected readonly tabOptions = computed(() => {
    const labels = this.tabLabels();
    return [
      {
        value: 'upcoming',
        label: labels.upcoming,
        badge: this.store.upcomingBookings().length,
      },
      {
        value: 'past',
        label: labels.past,
        badge: this.store.completedBookings().length,
      },
      {
        value: 'cancelled',
        label: labels.cancelled,
        badge: this.store.cancelledBookings().length,
      },
    ];
  });
  protected readonly visibleBookings = computed(() => {
    switch (this.activeTab()) {
      case 'past':
        return this.store.completedBookings();
      case 'cancelled':
        return this.store.cancelledBookings();
      default:
        return this.store.upcomingBookings();
    }
  });
  protected readonly emptyTitle = computed(() => {
    return this.emptyLabels()[`${this.activeTab()}Heading`];
  });
  protected readonly emptyDescription = computed(() => {
    return this.emptyLabels()[`${this.activeTab()}Description`];
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const tab = params.get('tab');
      this.activeTab.set(tab === 'past' || tab === 'cancelled' ? tab : 'upcoming');
    });

    void this.store.loadBookings();
  }

  protected setTab(value: string): void {
    if (value === 'upcoming' || value === 'past' || value === 'cancelled') {
      void this.router.navigate(['/sessions', value]);
    }
  }

  protected formatDateTime(isoString: string): string {
    return this.dateTime.formatInstantDateTime(isoString, {
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

  protected canJoin(booking: CoachingBooking): boolean {
    if (booking.status === 'cancelled') return false;
    const startsAt = new Date(booking.scheduled_at).getTime();
    const endsAt = startsAt + booking.duration_minutes * 60 * 1000;

    return startsAt - Date.now() <= 15 * 60 * 1000 && Date.now() <= endsAt;
  }

  protected recordingReady(booking: CoachingBooking): boolean {
    return booking.recording?.status === 'ready' && !!booking.recording.asset_id;
  }

  protected statusLabel(booking: CoachingBooking): string {
    if (booking.status === 'cancelled') return this.transloco.translate('common.status.cancelled');
    const endsAt = new Date(booking.scheduled_at).getTime() + booking.duration_minutes * 60 * 1000;
    return endsAt > Date.now()
      ? this.transloco.translate('common.status.upcoming')
      : this.transloco.translate('common.status.done');
  }

  protected recordingStatusLabel(booking: CoachingBooking): string {
    switch (booking.recording?.status) {
      case 'ready':
        return this.transloco.translate('common.status.recordingReady');
      case 'failed':
        return this.transloco.translate('common.status.recordingFailed');
      case 'starting':
      case 'started':
      case 'stopping':
      case 'stopped':
        return this.transloco.translate('common.status.recordingCaptured');
      default:
        return this.transloco.translate('common.status.recordingProcessing');
    }
  }

  protected otherParty(booking: CoachingBooking): string {
    return booking.expert_id === this.session.user()?.id
      ? booking.student_name || booking.student_id
      : booking.expert_name || booking.expert_id;
  }

  protected otherPartyRole(booking: CoachingBooking): string {
    return this.transloco.translate(
      booking.expert_id === this.session.user()?.id
        ? 'common.labels.student'
        : 'common.labels.expert',
    );
  }

  protected cancelDescription(booking: CoachingBooking): string {
    return this.transloco.translate('sessions.cancel.descriptionText', {
      otherParty: this.otherParty(booking),
      scheduledAt: this.formatDateTime(booking.scheduled_at),
    });
  }

  protected confirmCancel(result: unknown, booking: CoachingBooking): void {
    if (!result) return;
    const reason = typeof result === 'string' ? result : undefined;
    void this.store.cancelBooking(booking.group_id, booking.id, reason);
  }
}
