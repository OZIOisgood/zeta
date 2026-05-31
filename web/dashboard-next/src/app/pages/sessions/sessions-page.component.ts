import { Component, computed, effect, inject, signal } from '@angular/core';
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
import {
  NgpDialog,
  NgpDialogDescription,
  NgpDialogOverlay,
  NgpDialogTitle,
  NgpDialogTrigger,
} from 'ng-primitives/dialog';
import { CoachingBooking } from '../../core/http/coaching-api.service';
import { DashboardDateTimeService } from '../../core/i18n/dashboard-date-time.service';
import { SessionStore } from '../../features/session/session.store';
import { SessionsOverviewStore } from '../../features/sessions/sessions-overview.store';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
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
    NgpDialog,
    NgpDialogDescription,
    NgpDialogOverlay,
    NgpDialogTitle,
    NgpDialogTrigger,
    ZBadgeComponent,
    ZButtonComponent,
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
        <div class="flex flex-wrap gap-2">
          @if (canBook()) {
            <a
              routerLink="/sessions/book"
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--z-primary)] bg-[var(--z-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--z-primary-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)]"
            >
              <svg lucideCalendarClock class="size-4" aria-hidden="true"></svg>
              <span>{{ 'sessions.bookLive' | transloco }}</span>
            </a>
          }
          @if (canManageAvailability()) {
            <a
              routerLink="/sessions/settings"
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--z-border)] bg-white px-4 text-sm font-semibold text-[var(--z-text)] transition hover:bg-[var(--z-surface-warm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)]"
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
            <div class="grid gap-3">
              @for (booking of visibleBookings(); track booking.id) {
                <article class="rounded-lg border border-[var(--z-border)] bg-white p-4 shadow-sm">
                  <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <h2 class="text-base font-semibold">
                          {{ booking.session_type_name || ('sessions.book.sessionType' | transloco) }}
                        </h2>
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
                      <p class="mt-2 text-sm leading-6 text-[var(--z-muted)]">
                        {{ formatDateTime(booking.scheduled_at) }}
                        · {{ booking.duration_minutes }} min
                      </p>
                      <p class="mt-1 text-sm leading-6 text-[var(--z-muted)]">
                        {{ otherPartyRole(booking) }}: {{ otherParty(booking) }}
                      </p>
                      @if (booking.cancellation_reason) {
                        <p class="mt-2 text-sm leading-6 text-rose-700">
                          {{
                            'common.labels.reason'
                              | transloco: { reason: booking.cancellation_reason }
                          }}
                        </p>
                      }
                    </div>

                    <div class="flex flex-wrap gap-2 lg:justify-end">
                      @if (canJoin(booking)) {
                        <a
                          [routerLink]="['/sessions', booking.group_id, booking.id, 'call']"
                          class="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--z-primary)] bg-[var(--z-primary)] px-3 text-sm font-semibold text-white transition hover:bg-[var(--z-primary-strong)]"
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
                          <span>{{ 'common.status.recordingReady' | transloco }}</span>
                        </a>
                      }
                      @if (canCancel(booking)) {
                        <ng-template #cancelDialog let-close="close">
                          <div
                            ngpDialogOverlay
                            animate.enter="z-dialog-overlay-enter"
                            animate.leave="z-dialog-overlay-leave"
                            class="fixed inset-0 z-50 grid place-items-center bg-stone-950/35 p-4 backdrop-blur-sm"
                          >
                            <section
                              ngpDialog
                              ngpDialogRole="alertdialog"
                              [ngpDialogModal]="true"
                              animate.enter="z-dialog-panel-enter"
                              animate.leave="z-dialog-panel-leave"
                              class="w-full max-w-md rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-2xl shadow-stone-950/15"
                            >
                              <h2 ngpDialogTitle class="text-base font-semibold">
                                {{ 'sessions.cancel.title' | transloco }}
                              </h2>
                              <p
                                ngpDialogDescription
                                class="mt-2 text-sm leading-6 text-[var(--z-muted)]"
                              >
                                {{ cancelDescription(booking) }}
                              </p>
                              <z-textarea
                                class="mt-4 block"
                                [formControl]="cancelReasonControl"
                                [placeholder]="'sessions.cancel.placeholder' | transloco"
                                [rows]="3"
                              />
                              <div
                                class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
                              >
                                <z-button type="button" variant="secondary" (pressed)="close(null)">
                                  {{ 'sessions.cancel.keep' | transloco }}
                                </z-button>
                                <z-button
                                  type="button"
                                  variant="danger"
                                  [disabled]="store.mutationStatus() === 'loading'"
                                  (pressed)="close(cancelReasonControl.value.trim() || true)"
                                >
                                  {{ 'sessions.cancel.title' | transloco }}
                                </z-button>
                              </div>
                            </section>
                          </div>
                        </ng-template>
                        <z-button
                          size="sm"
                          variant="secondary"
                          [ngpDialogTrigger]="cancelDialog"
                          (pressed)="cancelReasonControl.reset('')"
                          (ngpDialogTriggerClosed)="confirmCancel($event, booking)"
                        >
                          <svg lucideX class="size-4" aria-hidden="true"></svg>
                          <span>{{ 'sessions.cancel.title' | transloco }}</span>
                        </z-button>
                      }
                    </div>
                  </div>
                </article>
              }
            </div>
          }
        }
      </z-tab-panel>
    </div>
  `,
  styles: `
    .z-dialog-overlay-enter {
      animation: z-dialog-overlay-in 120ms ease-out;
    }

    .z-dialog-overlay-leave {
      animation: z-dialog-overlay-out 100ms ease-in;
    }

    .z-dialog-panel-enter {
      animation: z-dialog-panel-in 140ms ease-out;
    }

    .z-dialog-panel-leave {
      animation: z-dialog-panel-out 100ms ease-in;
    }

    @keyframes z-dialog-overlay-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes z-dialog-overlay-out {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }

    @keyframes z-dialog-panel-in {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes z-dialog-panel-out {
      from {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateY(8px) scale(0.98);
      }
    }
  `,
})
export class SessionsPageComponent {
  protected readonly store = inject(SessionsOverviewStore);
  private readonly session = inject(SessionStore);
  private readonly dateTime = inject(DashboardDateTimeService);
  private readonly transloco = inject(TranslocoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly _translationEvents = toSignal(this.transloco.events$, { initialValue: null });

  protected readonly cancelReasonControl = new FormControl('', { nonNullable: true });
  protected readonly activeTab = signal<SessionTab>('upcoming');
  protected readonly canBook = computed(() => this.session.hasPermission('coaching:book'));
  protected readonly canManageAvailability = computed(() =>
    this.session.hasPermission('coaching:availability:manage'),
  );
  protected readonly tabOptions = computed(() => {
    this._translationEvents();
    return [
      {
        value: 'upcoming',
        label: this.transloco.translate('sessions.tabs.upcoming'),
        badge: this.store.upcomingBookings().length,
      },
      {
        value: 'past',
        label: this.transloco.translate('sessions.tabs.past'),
        badge: this.store.completedBookings().length,
      },
      {
        value: 'cancelled',
        label: this.transloco.translate('sessions.tabs.cancelled'),
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
    this._translationEvents();
    return this.transloco.translate(`sessions.empty.${this.activeTab()}Heading`);
  });
  protected readonly emptyDescription = computed(() => {
    this._translationEvents();
    return this.transloco.translate(`sessions.empty.${this.activeTab()}Description`);
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const tab = params.get('tab');
      this.activeTab.set(tab === 'past' || tab === 'cancelled' ? tab : 'upcoming');
    });

    effect(() => {
      if (this.store.status() === 'idle') {
        void this.store.loadBookings();
      }
    });
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
    return new Date(booking.scheduled_at).getTime() > Date.now()
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
