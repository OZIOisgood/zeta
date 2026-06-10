import { NgClass } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucideCalendar, LucideCheck, LucideClock } from '@lucide/angular';
import { CoachingSlot, ExpertInfo, SessionType } from '../../core/http/coaching-api.service';
import { Group } from '../../core/http/groups-api.service';
import { DashboardDateTimeService } from '../../core/i18n/dashboard-date-time.service';
import { BookingFlowStore } from '../../features/sessions/booking-flow.store';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZBreadcrumbsComponent } from '../../shared/ui/breadcrumbs/z-breadcrumbs.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZEmptyStateComponent } from '../../shared/ui/empty-state/z-empty-state.component';
import { ZGroupCardComponent } from '../../shared/ui/group-card/z-group-card.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';
import { StepperStep, ZStepperComponent } from '../../shared/ui/stepper/z-stepper.component';
import { ZTextareaComponent } from '../../shared/ui/textarea/z-textarea.component';

type BookingStep = 0 | 1 | 2 | 3 | 4;

@Component({
  selector: 'app-book-coaching-page',
  imports: [
    NgClass,
    ReactiveFormsModule,
    RouterLink,
    TranslocoPipe,
    ZBadgeComponent,
    ZBreadcrumbsComponent,
    ZButtonComponent,
    ZEmptyStateComponent,
    ZGroupCardComponent,
    ZSkeletonComponent,
    ZStepperComponent,
    ZTextareaComponent,
    LucideCalendar,
    LucideCheck,
    LucideClock,
  ],
  template: `
    <div class="grid gap-6">
      <z-breadcrumbs
        [items]="[
          { label: 'sessions.title', routerLink: '/sessions/upcoming' },
          { label: 'sessions.bookLive' },
        ]"
      />

      <section class="rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm">
        <div>
          <h1 class="text-2xl font-semibold sm:text-3xl">
            {{ 'sessions.bookLive' | transloco }}
          </h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-[var(--z-muted)]">
            {{ activeStepDescription() }}
          </p>
        </div>
      </section>

      <z-stepper [steps]="stepperSteps()" (stepClick)="goToCompletedStep($event)" />

      @if (store.status() === 'loading' && activeStep() === 0) {
        <div class="grid gap-3" aria-hidden="true">
          <z-skeleton class="block h-24 w-full"></z-skeleton>
          <z-skeleton class="block h-24 w-full"></z-skeleton>
        </div>
      } @else if (store.status() === 'error') {
        <z-empty-state
          [title]="'home.error.title' | transloco"
          [description]="store.error() || ('home.error.description' | transloco)"
        />
      } @else if (store.booking()) {
        <section
          class="rounded-lg border border-[var(--z-border)] bg-white p-6 text-center shadow-sm"
        >
          <div
            class="mx-auto grid size-12 place-items-center rounded-md bg-orange-50 text-[var(--z-primary)]"
          >
            <svg lucideCheck class="size-6" aria-hidden="true"></svg>
          </div>
          <h2 class="mt-4 text-xl font-semibold">
            {{ 'sessions.book.bookedHeading' | transloco }}
          </h2>
          <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--z-muted)]">
            {{ 'sessions.book.bookedDescription' | transloco }}
          </p>
          <a
            routerLink="/sessions/upcoming"
            class="mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--z-primary)] bg-[var(--z-primary)] px-4 text-sm font-semibold text-white"
          >
            {{ 'sessions.book.viewSessions' | transloco }}
          </a>
        </section>
      } @else {
        @switch (activeStep()) {
          @case (0) {
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              @for (group of store.groups(); track group.id) {
                <button
                  type="button"
                  class="block h-full w-full rounded-lg border-0 bg-transparent p-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)]"
                  (click)="selectGroup(group)"
                >
                  <z-group-card
                    [group]="group"
                    [selected]="selectedGroup()?.id === group.id"
                    [noDescription]="'groups.phase4.noDescription' | transloco"
                  />
                </button>
              } @empty {
                <z-empty-state
                  [title]="'groups.noGroupsYet' | transloco"
                  [description]="'groups.noGroupsJoined' | transloco"
                />
              }
            </div>
          }
          @case (1) {
            @if (store.slotStatus() === 'loading') {
              <z-skeleton class="block h-28 w-full"></z-skeleton>
            } @else {
              <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                @for (expert of store.experts(); track expert.expert_id) {
                  <button
                    type="button"
                    class="rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-[var(--z-primary-soft)] hover:bg-[var(--z-surface-warm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)]"
                    [ngClass]="
                      selectedExpert()?.expert_id === expert.expert_id
                        ? 'border-[var(--z-primary)]'
                        : 'border-[var(--z-border)]'
                    "
                    (click)="selectExpert(expert)"
                  >
                    <div class="flex items-center gap-3">
                      <span
                        class="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-[var(--z-surface-warm)] text-base font-semibold text-[var(--z-primary)]"
                      >
                        @if (expert.avatar) {
                          <img
                            class="size-full object-cover"
                            [src]="avatarSrc(expert.avatar)"
                            alt=""
                          />
                        } @else {
                          {{ expertInitials(expert) }}
                        }
                      </span>
                      <span class="min-w-0">
                        <span class="block truncate text-base font-semibold">
                          {{ expertName(expert) }}
                        </span>
                      </span>
                    </div>
                  </button>
                } @empty {
                  <z-empty-state
                    class="block sm:col-span-2 xl:col-span-3"
                    [title]="'sessions.book.noExperts' | transloco"
                    [description]="'sessions.book.noExpertsDescription' | transloco"
                  />
                }
              </div>
            }
          }
          @case (2) {
            @if (store.slotStatus() === 'loading') {
              <z-skeleton class="block h-28 w-full"></z-skeleton>
            } @else {
              <div class="grid gap-3 md:grid-cols-2">
                @for (type of store.activeSessionTypes(); track type.id) {
                  <button
                    type="button"
                    class="rounded-lg border bg-white p-4 text-left shadow-sm transition hover:bg-[var(--z-surface-warm)]"
                    [ngClass]="
                      selectedSessionType()?.id === type.id
                        ? 'border-[var(--z-primary)]'
                        : 'border-[var(--z-border)]'
                    "
                    (click)="selectSessionType(type)"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <h2 class="font-semibold">{{ type.name }}</h2>
                      <z-badge>{{ type.duration_minutes }} min</z-badge>
                    </div>
                    <p class="mt-2 line-clamp-3 text-sm leading-6 text-[var(--z-muted)]">
                      {{ type.description }}
                    </p>
                  </button>
                } @empty {
                  <z-empty-state
                    [title]="'sessions.book.noSessionTypes' | transloco"
                    [description]="'sessions.book.noSessionTypesDescription' | transloco"
                  />
                }
              </div>
            }
          }
          @case (3) {
            @if (store.slotStatus() === 'loading') {
              <div class="grid gap-3 md:grid-cols-[16rem_minmax(0,1fr)]" aria-hidden="true">
                <z-skeleton class="block h-64 w-full"></z-skeleton>
                <z-skeleton class="block h-64 w-full"></z-skeleton>
              </div>
            } @else if (store.slots().length === 0) {
              <z-empty-state
                [title]="'sessions.book.noTimes' | transloco"
                [description]="'sessions.book.noTimesDescription' | transloco"
              />
            } @else {
              <section class="grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
                <div class="rounded-lg border border-[var(--z-border)] bg-white p-3 shadow-sm">
                  <h2 class="text-sm font-semibold">
                    {{ 'sessions.book.selectTime' | transloco }}
                  </h2>
                  <div class="mt-3 grid gap-2">
                    @for (date of store.availableDates(); track date) {
                      <button
                        type="button"
                        class="rounded-md border px-3 py-2 text-left text-sm font-semibold"
                        [ngClass]="
                          selectedDate() === date
                            ? 'border-[var(--z-primary)] bg-[var(--z-surface-warm)] text-[var(--z-primary-strong)]'
                            : 'border-[var(--z-border)] bg-white'
                        "
                        (click)="selectedDate.set(date)"
                      >
                        {{ formatDate(date) }}
                      </button>
                    }
                  </div>
                </div>
                <div class="rounded-lg border border-[var(--z-border)] bg-white p-3 shadow-sm">
                  <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    @for (slot of slotsForSelectedDate(); track slot.starts_at) {
                      <button
                        type="button"
                        class="rounded-md border p-3 text-left transition hover:bg-[var(--z-surface-warm)]"
                        [ngClass]="
                          selectedSlot()?.starts_at === slot.starts_at
                            ? 'border-[var(--z-primary)] bg-[var(--z-surface-warm)]'
                            : 'border-[var(--z-border)]'
                        "
                        (click)="selectSlot(slot)"
                      >
                        <svg
                          lucideClock
                          class="mb-2 size-4 text-[var(--z-primary)]"
                          aria-hidden="true"
                        ></svg>
                        <span class="text-sm font-semibold">{{ formatSlotTime(slot) }}</span>
                      </button>
                    } @empty {
                      <p class="text-sm text-[var(--z-muted)]">
                        {{ 'sessions.book.selectDate' | transloco }}
                      </p>
                    }
                  </div>
                </div>
              </section>
            }
          }
          @case (4) {
            <section class="rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm">
              <h2 class="text-lg font-semibold">
                {{ 'sessions.book.confirmDescription' | transloco }}
              </h2>
              <div class="mt-4 grid gap-3 text-sm">
                <div class="flex items-center gap-2">
                  <svg
                    lucideCalendar
                    class="size-4 text-[var(--z-primary)]"
                    aria-hidden="true"
                  ></svg>
                  <span>{{ selectedSlot() ? formatSlotDateTime(selectedSlot()!) : '' }}</span>
                </div>
                <p>
                  <strong>{{ 'sessions.book.selectExpert' | transloco }}:</strong>
                  {{ selectedExpert() ? expertName(selectedExpert()!) : '' }}
                </p>
                <p>
                  <strong>{{ 'sessions.book.sessionType' | transloco }}:</strong>
                  {{ selectedSessionType()?.name }}
                </p>
              </div>
              <z-textarea
                class="mt-4 block"
                [formControl]="notesControl"
                [placeholder]="'sessions.book.notesPlaceholder' | transloco"
                [rows]="4"
              />
              @if (store.mutationStatus() === 'error') {
                <p class="mt-3 text-sm text-rose-700">
                  {{ store.mutationError() || ('sessions.book.failed' | transloco) }}
                </p>
              }
              <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <z-button
                  type="button"
                  variant="secondary"
                  [mobileFullWidth]="true"
                  [nowrap]="true"
                  (pressed)="activeStep.set(3)"
                >
                  {{ 'common.actions.back' | transloco }}
                </z-button>
                <z-button
                  type="button"
                  [disabled]="store.mutationStatus() === 'loading'"
                  [mobileFullWidth]="true"
                  [nowrap]="true"
                  (pressed)="confirmBooking()"
                >
                  {{
                    store.mutationStatus() === 'loading'
                      ? ('sessions.book.booking' | transloco)
                      : ('sessions.book.bookSession' | transloco)
                  }}
                </z-button>
              </div>
            </section>
          }
        }
      }
    </div>
  `,
})
export class BookCoachingPageComponent {
  protected readonly store = inject(BookingFlowStore);
  private readonly dateTime = inject(DashboardDateTimeService);
  private readonly transloco = inject(TranslocoService);
  private readonly _translationEvents = toSignal(this.transloco.events$, { initialValue: null });

  protected readonly activeStep = signal<BookingStep>(0);
  protected readonly selectedGroup = signal<Group | null>(null);
  protected readonly selectedExpert = signal<ExpertInfo | null>(null);
  protected readonly selectedSessionType = signal<SessionType | null>(null);
  protected readonly selectedDate = signal('');
  protected readonly selectedSlot = signal<CoachingSlot | null>(null);
  protected readonly notesControl = new FormControl('', { nonNullable: true });

  protected readonly stepperSteps = computed(() => {
    this._translationEvents();
    return [
      this.transloco.translate('sessions.book.selectGroup'),
      this.transloco.translate('sessions.book.selectExpert'),
      this.transloco.translate('sessions.book.sessionType'),
      this.transloco.translate('sessions.book.selectTime'),
      this.transloco.translate('common.actions.confirm'),
    ].map(
      (label, index): StepperStep => ({
        label,
        state:
          index < this.activeStep()
            ? 'completed'
            : index === this.activeStep()
              ? 'active'
              : 'upcoming',
      }),
    );
  });
  protected readonly activeStepDescription = computed(() => {
    this._translationEvents();
    switch (this.activeStep()) {
      case 1:
        return this.transloco.translate('sessions.book.selectExpertDescription');
      case 2:
        return this.transloco.translate('sessions.book.sessionTypeDescription');
      case 3:
        return this.transloco.translate('sessions.book.selectSlotDescription');
      case 4:
        return this.transloco.translate('sessions.book.confirmDescription');
      default:
        return this.transloco.translate('sessions.book.selectGroupDescription');
    }
  });
  protected readonly slotsForSelectedDate = computed(() =>
    this.selectedDate() ? (this.store.slotsByDate().get(this.selectedDate()) ?? []) : [],
  );

  constructor() {
    this.store.resetBooking();

    effect(() => {
      if (this.store.status() === 'idle') {
        void this.store.loadGroups();
      }
    });

    effect(() => {
      const firstDate = this.store.availableDates()[0];
      if (!this.selectedDate() && firstDate) {
        this.selectedDate.set(firstDate);
      }
    });
  }

  protected selectGroup(group: Group): void {
    this.selectedGroup.set(group);
    this.selectedExpert.set(null);
    this.selectedSessionType.set(null);
    this.selectedSlot.set(null);
    this.activeStep.set(1);
    void this.store.loadExperts(group.id);
  }

  protected selectExpert(expert: ExpertInfo): void {
    const group = this.selectedGroup();
    if (!group) return;
    this.selectedExpert.set(expert);
    this.selectedSessionType.set(null);
    this.selectedSlot.set(null);
    this.activeStep.set(2);
    void this.store.loadSessionTypes(group.id);
  }

  protected selectSessionType(type: SessionType): void {
    const group = this.selectedGroup();
    const expert = this.selectedExpert();
    if (!group || !expert) return;
    this.selectedSessionType.set(type);
    this.selectedSlot.set(null);
    this.selectedDate.set('');
    this.activeStep.set(3);
    void this.store.loadSlots(group.id, expert.expert_id, type.id);
  }

  protected selectSlot(slot: CoachingSlot): void {
    this.selectedSlot.set(slot);
    this.activeStep.set(4);
  }

  protected goToCompletedStep(index: number): void {
    if (index < this.activeStep()) {
      this.activeStep.set(index as BookingStep);
    }
  }

  protected expertName(expert: ExpertInfo): string {
    return expert.username || expert.expert_id;
  }

  protected expertInitials(expert: ExpertInfo): string {
    return (expert.username || expert.expert_id).trim().charAt(0).toUpperCase() || '?';
  }

  protected avatarSrc(avatar: string): string {
    return avatar.startsWith('data:') ? avatar : `data:image/jpeg;base64,${avatar}`;
  }

  protected formatDate(date: string): string {
    return this.dateTime.formatCalendarDate(date, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  protected formatSlotTime(slot: CoachingSlot): string {
    return `${this.formatTime(slot.starts_at)} - ${this.formatTime(slot.ends_at)}`;
  }

  protected formatSlotDateTime(slot: CoachingSlot): string {
    return `${this.dateTime.formatInstantDate(slot.starts_at, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })}, ${this.formatSlotTime(slot)} (${this.transloco.translate('common.labels.yourLocalTime')})`;
  }

  protected formatTime(isoString: string): string {
    return this.dateTime.formatInstantTime(isoString);
  }

  protected async confirmBooking(): Promise<void> {
    const group = this.selectedGroup();
    const expert = this.selectedExpert();
    const sessionType = this.selectedSessionType();
    const slot = this.selectedSlot();
    if (!group || !expert || !sessionType || !slot) return;

    await this.store.createBooking(group.id, {
      expert_id: expert.expert_id,
      session_type_id: sessionType.id,
      scheduled_at: slot.starts_at,
      notes: this.notesControl.value.trim() || undefined,
    });
  }
}
