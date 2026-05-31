import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  LucideCalendarOff,
  LucidePencil,
  LucidePlus,
  LucideTrash,
  LucideUsers,
} from '@lucide/angular';
import { NgpDialogTrigger } from 'ng-primitives/dialog';
import { CoachingAvailability, SessionType } from '../../core/http/coaching-api.service';
import { Group } from '../../core/http/groups-api.service';
import { DashboardDateTimeService } from '../../core/i18n/dashboard-date-time.service';
import { DashboardLocalizationService } from '../../core/i18n/dashboard-localization.service';
import { AvailabilityStore } from '../../features/sessions/availability.store';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { BreadcrumbItem, ZBreadcrumbsComponent } from '../../shared/ui/breadcrumbs/z-breadcrumbs.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZDialogPanelComponent } from '../../shared/ui/dialog/z-dialog-panel.component';
import { ZFormDialogComponent } from '../../shared/ui/dialog/z-form-dialog.component';
import { ZEmptyStateComponent } from '../../shared/ui/empty-state/z-empty-state.component';
import { SelectOption, ZSelectComponent } from '../../shared/ui/select/z-select.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';
import { ZTabPanelComponent } from '../../shared/ui/tabs/z-tab-panel.component';
import { ZTabsComponent } from '../../shared/ui/tabs/z-tabs.component';
import { ZTextInputComponent } from '../../shared/ui/text-input/z-text-input.component';
import { ZTextareaComponent } from '../../shared/ui/textarea/z-textarea.component';
import { orderedWeekdayValues, resolveFirstDayOfWeek } from '../../shared/utils/weekdays';

type AvailabilityTab = 'session-types' | 'schedule' | 'blocked';

@Component({
  selector: 'app-manage-availability-page',
  imports: [
    ReactiveFormsModule,
    TranslocoPipe,
    NgpDialogTrigger,
    ZBadgeComponent,
    ZBreadcrumbsComponent,
    ZButtonComponent,
    ZDialogPanelComponent,
    ZFormDialogComponent,
    ZEmptyStateComponent,
    ZSelectComponent,
    ZSkeletonComponent,
    ZTabPanelComponent,
    ZTabsComponent,
    ZTextInputComponent,
    ZTextareaComponent,
    LucideCalendarOff,
    LucidePencil,
    LucidePlus,
    LucideTrash,
    LucideUsers,
  ],
  template: `
    <div class="grid gap-6">
      <z-breadcrumbs [items]="breadcrumbs()" />

      <section class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">
            {{ 'sessions.availability.title' | transloco }}
          </h1>
          @if (store.activeGroup(); as group) {
            <p class="mt-1 text-sm leading-6 text-[var(--z-muted)]">{{ group.name }}</p>
          }
        </div>
        @if (store.activeGroup()) {
          @switch (activeTab()) {
            @case ('session-types') {
              <z-button
                type="button"
                (pressed)="prepareSessionType(null)"
                [ngpDialogTrigger]="sessionTypeDialog"
                (ngpDialogTriggerClosed)="saveSessionType($event)"
              >
                <svg lucidePlus class="size-4" aria-hidden="true"></svg>
                <span>{{ 'sessions.availability.addSessionType' | transloco }}</span>
              </z-button>
            }
            @case ('schedule') {
              <z-button
                type="button"
                (pressed)="prepareAvailability(null)"
                [ngpDialogTrigger]="availabilityDialog"
                (ngpDialogTriggerClosed)="saveAvailability($event)"
              >
                <svg lucidePlus class="size-4" aria-hidden="true"></svg>
                <span>{{ 'sessions.availability.addAvailability' | transloco }}</span>
              </z-button>
            }
            @case ('blocked') {
              <z-button
                type="button"
                (pressed)="prepareBlockedSlot()"
                [ngpDialogTrigger]="blockedDialog"
                (ngpDialogTriggerClosed)="saveBlockedSlot($event)"
              >
                <svg lucidePlus class="size-4" aria-hidden="true"></svg>
                <span>{{ 'sessions.availability.addBlockTime' | transloco }}</span>
              </z-button>
            }
          }
        }
      </section>

      @if (store.status() === 'loading') {
        <z-skeleton class="block h-64 w-full"></z-skeleton>
      } @else if (store.status() === 'error') {
        <z-empty-state
          [title]="'home.error.title' | transloco"
          [description]="store.error() || ('home.error.description' | transloco)"
        />
      } @else if (!store.activeGroup()) {
        <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          @for (group of store.groups(); track group.id) {
            <button
              type="button"
              class="rounded-lg border border-[var(--z-border)] bg-white p-4 text-left shadow-sm transition hover:border-[var(--z-primary-soft)] hover:bg-[var(--z-surface-warm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)]"
              (click)="selectGroup(group)"
            >
              <div class="flex items-start gap-3">
                <span
                  class="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-[var(--z-surface-warm)] text-[var(--z-primary)]"
                >
                  @if (group.avatar) {
                    <img class="size-full object-cover" [src]="avatarSrc(group.avatar)" alt="" />
                  } @else {
                    <svg lucideUsers class="size-6" aria-hidden="true"></svg>
                  }
                </span>
                <span class="min-w-0">
                  <span class="block truncate text-base font-semibold">{{ group.name }}</span>
                  <span class="mt-1 line-clamp-3 block text-sm leading-5 text-[var(--z-muted)]">
                    {{ group.description || ('groups.phase4.noDescription' | transloco) }}
                  </span>
                </span>
              </div>
            </button>
          } @empty {
            <z-empty-state
              [title]="'sessions.availability.noGroups' | transloco"
              [description]="'sessions.availability.noGroupsDescription' | transloco"
            />
          }
        </section>
      } @else {
        <z-tabs
          tabsId="availability-tabs"
          [label]="'sessions.availability.title' | transloco"
          [value]="activeTab()"
          [options]="tabOptions()"
          (valueChange)="setTab($event)"
        />

        <z-tab-panel tabsId="availability-tabs" [value]="activeTab()">
          @if (store.mutationStatus() === 'error') {
            <p class="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {{ store.mutationError() }}
            </p>
          }

          @switch (activeTab()) {
          @case ('session-types') {
            <div class="grid gap-3">
              @for (type of store.sessionTypes(); track type.id) {
                <article class="rounded-lg border border-[var(--z-border)] bg-white p-4 shadow-sm">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <h2 class="font-semibold">{{ type.name }}</h2>
                        <z-badge>{{ type.duration_minutes }} min</z-badge>
                      </div>
                      <p class="mt-2 line-clamp-3 text-sm leading-6 text-[var(--z-muted)]">
                        {{ type.description }}
                      </p>
                    </div>
                    <div class="flex shrink-0 gap-2">
                      <z-button
                        size="sm"
                        variant="secondary"
                        type="button"
                        [iconOnly]="true"
                        [ariaLabel]="'common.actions.edit' | transloco"
                        (pressed)="prepareSessionType(type)"
                        [ngpDialogTrigger]="sessionTypeDialog"
                        (ngpDialogTriggerClosed)="saveSessionType($event)"
                      >
                        <svg lucidePencil class="size-4" aria-hidden="true"></svg>
                      </z-button>
                      <ng-template #deleteTypeDialog let-close="close">
                        <z-dialog-panel
                          [title]="'sessions.availability.deleteSessionType' | transloco"
                          [description]="'sessions.availability.confirmDelete' | transloco"
                          tone="danger"
                          [confirmLabel]="'common.actions.delete' | transloco"
                          [cancelLabel]="'common.actions.cancel' | transloco"
                          [close]="close"
                        />
                      </ng-template>
                      <z-button
                        size="sm"
                        variant="secondary"
                        type="button"
                        [iconOnly]="true"
                        [ariaLabel]="'common.actions.delete' | transloco"
                        [ngpDialogTrigger]="deleteTypeDialog"
                        (ngpDialogTriggerClosed)="deleteSessionType($event, type.id)"
                      >
                        <svg lucideTrash class="size-4" aria-hidden="true"></svg>
                      </z-button>
                    </div>
                  </div>
                </article>
              } @empty {
                <z-empty-state
                  [title]="'sessions.availability.noSessionTypes' | transloco"
                  [description]="'sessions.availability.noSessionTypesDescription' | transloco"
                />
              }
            </div>
          }
          @case ('schedule') {
            <div class="grid gap-3">
              @for (item of store.availability(); track item.id) {
                <article class="rounded-lg border border-[var(--z-border)] bg-white p-4 shadow-sm">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <h2 class="font-semibold">{{ dayName(item.day_of_week) }}</h2>
                      <p class="mt-1 text-sm text-[var(--z-muted)]">
                        {{ item.start_time }} - {{ item.end_time }}
                      </p>
                    </div>
                    <div class="flex gap-2">
                      <z-button
                        size="sm"
                        variant="secondary"
                        type="button"
                        [iconOnly]="true"
                        [ariaLabel]="'common.actions.edit' | transloco"
                        (pressed)="prepareAvailability(item)"
                        [ngpDialogTrigger]="availabilityDialog"
                        (ngpDialogTriggerClosed)="saveAvailability($event)"
                      >
                        <svg lucidePencil class="size-4" aria-hidden="true"></svg>
                      </z-button>
                      <ng-template #deleteAvailabilityDialog let-close="close">
                        <z-dialog-panel
                          [title]="'sessions.availability.deleteAvailability' | transloco"
                          [description]="'sessions.availability.confirmDelete' | transloco"
                          tone="danger"
                          [confirmLabel]="'common.actions.delete' | transloco"
                          [cancelLabel]="'common.actions.cancel' | transloco"
                          [close]="close"
                        />
                      </ng-template>
                      <z-button
                        size="sm"
                        variant="secondary"
                        type="button"
                        [iconOnly]="true"
                        [ariaLabel]="'common.actions.delete' | transloco"
                        [ngpDialogTrigger]="deleteAvailabilityDialog"
                        (ngpDialogTriggerClosed)="deleteAvailability($event, item.id)"
                      >
                        <svg lucideTrash class="size-4" aria-hidden="true"></svg>
                      </z-button>
                    </div>
                  </div>
                </article>
              } @empty {
                <z-empty-state
                  [title]="'sessions.availability.noAvailability' | transloco"
                  [description]="'sessions.availability.noAvailabilityDescription' | transloco"
                />
              }
            </div>
          }
          @case ('blocked') {
            <div class="grid gap-3">
              @for (slot of store.blockedSlots(); track slot.id) {
                <article class="rounded-lg border border-[var(--z-border)] bg-white p-4 shadow-sm">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <h2 class="flex items-center gap-2 font-semibold">
                        <svg
                          lucideCalendarOff
                          class="size-4 text-[var(--z-primary)]"
                          aria-hidden="true"
                        ></svg>
                        <span>{{ formatBlockedDate(slot.blocked_date) }}</span>
                      </h2>
                      @if (slot.start_time || slot.end_time) {
                        <p class="mt-1 text-sm text-[var(--z-muted)]">
                          {{ slot.start_time || '00:00' }} - {{ slot.end_time || '23:59' }}
                        </p>
                      }
                      @if (slot.reason) {
                        <p class="mt-2 text-sm leading-6 text-[var(--z-muted)]">
                          {{ slot.reason }}
                        </p>
                      }
                    </div>
                    <ng-template #deleteBlockedDialog let-close="close">
                      <z-dialog-panel
                        [title]="'sessions.availability.deleteBlockedDate' | transloco"
                        [description]="'sessions.availability.confirmDelete' | transloco"
                        tone="danger"
                        [confirmLabel]="'common.actions.delete' | transloco"
                        [cancelLabel]="'common.actions.cancel' | transloco"
                        [close]="close"
                      />
                    </ng-template>
                    <z-button
                      size="sm"
                      variant="secondary"
                      type="button"
                      [iconOnly]="true"
                      [ariaLabel]="'common.actions.delete' | transloco"
                      [ngpDialogTrigger]="deleteBlockedDialog"
                      (ngpDialogTriggerClosed)="deleteBlockedSlot($event, slot.id)"
                    >
                      <svg lucideTrash class="size-4" aria-hidden="true"></svg>
                    </z-button>
                  </div>
                </article>
              } @empty {
                <z-empty-state
                  [title]="'sessions.availability.noBlockedDates' | transloco"
                  [description]="'sessions.availability.noBlockedDatesDescription' | transloco"
                />
              }
            </div>
          }
          }
        </z-tab-panel>
      }

      <ng-template #sessionTypeDialog let-close="close">
        <z-form-dialog
          [title]="
            editingSessionType()
              ? ('sessions.availability.editSessionType' | transloco)
              : ('sessions.availability.addSessionType' | transloco)
          "
          (cancelled)="close(null)"
          (saved)="close(sessionTypePayload())"
        >
          <label class="grid gap-1 text-sm font-semibold">
            <span>{{ 'common.fields.name' | transloco }}</span>
            <z-text-input
              [formControl]="sessionTypeName"
              [placeholder]="'sessions.availability.namePlaceholder' | transloco"
            />
          </label>
          <label class="grid gap-1 text-sm font-semibold">
            <span>{{ 'common.fields.description' | transloco }}</span>
            <z-textarea
              [formControl]="sessionTypeDescription"
              [placeholder]="'sessions.availability.descriptionPlaceholder' | transloco"
              [rows]="3"
            />
          </label>
          <label class="grid gap-1 text-sm font-semibold">
            <span>{{ 'common.fields.duration' | transloco }}</span>
            <z-text-input
              type="number"
              [formControl]="sessionTypeDuration"
              placeholder="45"
              inputMode="numeric"
            />
          </label>
        </z-form-dialog>
      </ng-template>

      <ng-template #availabilityDialog let-close="close">
        <z-form-dialog
          [title]="
            editingAvailability()
              ? ('sessions.availability.editAvailability' | transloco)
              : ('sessions.availability.addAvailability' | transloco)
          "
          (cancelled)="close(null)"
          (saved)="close(availabilityPayload())"
        >
          <label class="grid gap-1 text-sm font-semibold">
            <span>{{ 'common.labels.day' | transloco }}</span>
            <z-select
              [value]="availabilityDay.value"
              [options]="dayOptions()"
              (valueChange)="availabilityDay.setValue($event)"
            />
          </label>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="grid gap-1 text-sm font-semibold">
              <span>{{ 'common.fields.startTime' | transloco }}</span>
              <z-text-input type="time" [formControl]="availabilityStart" />
            </label>
            <label class="grid gap-1 text-sm font-semibold">
              <span>{{ 'common.fields.endTime' | transloco }}</span>
              <z-text-input type="time" [formControl]="availabilityEnd" />
            </label>
          </div>
        </z-form-dialog>
      </ng-template>

      <ng-template #blockedDialog let-close="close">
        <z-form-dialog
          [title]="'sessions.availability.blockTime' | transloco"
          (cancelled)="close(null)"
          (saved)="close(blockedPayload())"
        >
          <label class="grid gap-1 text-sm font-semibold">
            <span>{{ 'common.fields.date' | transloco }}</span>
            <z-text-input type="date" [formControl]="blockedDate" />
          </label>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="grid gap-1 text-sm font-semibold">
              <span>{{ 'common.fields.startTime' | transloco }}</span>
              <z-text-input type="time" [formControl]="blockedStart" />
            </label>
            <label class="grid gap-1 text-sm font-semibold">
              <span>{{ 'common.fields.endTime' | transloco }}</span>
              <z-text-input type="time" [formControl]="blockedEnd" />
            </label>
          </div>
          <label class="grid gap-1 text-sm font-semibold">
            <span>{{ 'common.fields.reasonOptional' | transloco }}</span>
            <z-textarea
              [formControl]="blockedReason"
              [placeholder]="'sessions.availability.reasonPlaceholder' | transloco"
              [rows]="3"
            />
          </label>
        </z-form-dialog>
      </ng-template>
    </div>
  `,
})
export class ManageAvailabilityPageComponent {
  protected readonly store = inject(AvailabilityStore);
  private readonly dateTime = inject(DashboardDateTimeService);
  private readonly localization = inject(DashboardLocalizationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly _translationEvents = toSignal(this.transloco.events$, { initialValue: null });

  protected readonly activeTab = signal<AvailabilityTab>('session-types');
  protected readonly editingSessionType = signal<SessionType | null>(null);
  protected readonly editingAvailability = signal<CoachingAvailability | null>(null);

  protected readonly sessionTypeName = new FormControl('', { nonNullable: true });
  protected readonly sessionTypeDescription = new FormControl('', { nonNullable: true });
  protected readonly sessionTypeDuration = new FormControl('45', { nonNullable: true });
  protected readonly availabilityDay = new FormControl('1', { nonNullable: true });
  protected readonly availabilityStart = new FormControl('09:00', { nonNullable: true });
  protected readonly availabilityEnd = new FormControl('17:00', { nonNullable: true });
  protected readonly blockedDate = new FormControl('', { nonNullable: true });
  protected readonly blockedStart = new FormControl('', { nonNullable: true });
  protected readonly blockedEnd = new FormControl('', { nonNullable: true });
  protected readonly blockedReason = new FormControl('', { nonNullable: true });

  protected readonly dayOptions = computed<SelectOption[]>(() => {
    this._translationEvents();
    const firstDay = resolveFirstDayOfWeek(
      this.localization.timeZone(),
      this.localization.dateLocale(),
    );

    return orderedWeekdayValues(firstDay).map((day) => ({
      value: String(day),
      label: this.dayName(day),
    }));
  });
  protected readonly tabOptions = computed(() => {
    this._translationEvents();
    return [
      {
        value: 'session-types',
        label: this.transloco.translate('sessions.availability.sessionTypes'),
        badge: this.store.sessionTypes().length,
      },
      {
        value: 'schedule',
        label: this.transloco.translate('sessions.availability.weeklySchedule'),
        badge: this.store.availability().length,
      },
      {
        value: 'blocked',
        label: this.transloco.translate('sessions.availability.blockedDates'),
        badge: this.store.blockedSlots().length,
      },
    ];
  });
  protected readonly breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const group = this.store.activeGroup();
    const items: BreadcrumbItem[] = [
      { label: 'sessions.title', routerLink: '/sessions/upcoming' },
    ];

    if (group) {
      items.push({
        label: 'sessions.availability.title',
        routerLink: '/sessions/settings',
      });
      items.push({ label: group.name, translate: false });
    } else {
      items.push({ label: 'sessions.availability.title' });
    }

    return items;
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const groupId = params.get('groupId') ?? undefined;
      const tab = params.get('tab');
      if (tab === 'schedule' || tab === 'blocked' || tab === 'session-types') {
        this.activeTab.set(tab);
      }
      void this.store.loadGroups(groupId);
    });
  }

  protected selectGroup(group: Group): void {
    void this.router.navigate(['/sessions', 'settings', group.id, this.activeTab()]);
  }

  protected setTab(tab: string): void {
    if (tab !== 'session-types' && tab !== 'schedule' && tab !== 'blocked') return;
    const group = this.store.activeGroup();
    this.activeTab.set(tab);
    if (group) {
      void this.router.navigate(['/sessions', 'settings', group.id, tab]);
    }
  }

  protected prepareSessionType(type: SessionType | null): void {
    this.editingSessionType.set(type);
    this.sessionTypeName.setValue(type?.name ?? '');
    this.sessionTypeDescription.setValue(type?.description ?? '');
    this.sessionTypeDuration.setValue(String(type?.duration_minutes ?? 45));
  }

  protected sessionTypePayload(): {
    name: string;
    description: string;
    duration_minutes: number;
  } | null {
    const name = this.sessionTypeName.value.trim();
    const duration = Number(this.sessionTypeDuration.value);
    if (!name || !Number.isFinite(duration) || duration <= 0) return null;
    return {
      name,
      description: this.sessionTypeDescription.value.trim(),
      duration_minutes: duration,
    };
  }

  protected saveSessionType(payload: unknown): void {
    if (!payload) return;
    const editing = this.editingSessionType();
    if (editing) {
      void this.store.updateSessionType(editing.id, payload as never);
    } else {
      void this.store.createSessionType(payload as never);
    }
  }

  protected prepareAvailability(item: CoachingAvailability | null): void {
    this.editingAvailability.set(item);
    this.availabilityDay.setValue(String(item?.day_of_week ?? 1));
    this.availabilityStart.setValue(item?.start_time ?? '09:00');
    this.availabilityEnd.setValue(item?.end_time ?? '17:00');
  }

  protected availabilityPayload(): {
    day_of_week: number;
    start_time: string;
    end_time: string;
  } | null {
    if (!this.availabilityStart.value || !this.availabilityEnd.value) return null;
    return {
      day_of_week: Number(this.availabilityDay.value),
      start_time: this.availabilityStart.value,
      end_time: this.availabilityEnd.value,
    };
  }

  protected saveAvailability(payload: unknown): void {
    if (!payload) return;
    const editing = this.editingAvailability();
    if (editing) {
      void this.store.updateAvailability(editing.id, payload as never);
    } else {
      void this.store.createAvailability(payload as never);
    }
  }

  protected prepareBlockedSlot(): void {
    this.blockedDate.setValue(new Date().toISOString().slice(0, 10));
    this.blockedStart.setValue('');
    this.blockedEnd.setValue('');
    this.blockedReason.setValue('');
  }

  protected blockedPayload(): {
    blocked_date: string;
    start_time?: string;
    end_time?: string;
    reason?: string;
  } | null {
    if (!this.blockedDate.value) return null;
    return {
      blocked_date: this.blockedDate.value,
      start_time: this.blockedStart.value || undefined,
      end_time: this.blockedEnd.value || undefined,
      reason: this.blockedReason.value.trim() || undefined,
    };
  }

  protected saveBlockedSlot(payload: unknown): void {
    if (payload) void this.store.createBlockedSlot(payload as never);
  }

  protected deleteSessionType(result: unknown, id: string): void {
    if (result === true) void this.store.deleteSessionType(id);
  }

  protected deleteAvailability(result: unknown, id: string): void {
    if (result === true) void this.store.deleteAvailability(id);
  }

  protected deleteBlockedSlot(result: unknown, id: string): void {
    if (result === true) void this.store.deleteBlockedSlot(id);
  }

  protected dayName(day: number): string {
    return this.transloco.translate(`weekdays.${day}`);
  }

  protected formatBlockedDate(date: string): string {
    return this.dateTime.formatCalendarDate(date, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  protected avatarSrc(avatar: string): string {
    return avatar.startsWith('data:') ? avatar : `data:image/jpeg;base64,${avatar}`;
  }
}
