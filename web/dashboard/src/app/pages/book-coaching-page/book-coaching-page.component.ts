import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TuiDay, TuiMonth } from '@taiga-ui/cdk/date-time';
import {
  TuiAlertService,
  TuiAppearance,
  TuiButton,
  TuiCalendar,
  TuiLabel,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiAvatar, TuiSkeleton, TuiSlides, TuiStep, TuiStepper, TuiTextarea } from '@taiga-ui/kit';
import { TuiCardMedium } from '@taiga-ui/layout';
import { GroupsListComponent } from '../../shared/components/groups-list/groups-list.component';
import { IllustratedMessageComponent } from '../../shared/components/illustrated-message/illustrated-message.component';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import {
  CoachingService,
  CoachingSlot,
  ExpertInfo,
  SessionType,
} from '../../shared/services/coaching.service';
import { Group, GroupsService } from '../../shared/services/groups.service';

@Component({
  selector: 'app-book-coaching-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageContainerComponent,
    SectionHeaderComponent,
    TuiButton,
    TuiStepper,
    TuiStep,
    TuiSlides,
    TuiAvatar,
    TuiSkeleton,
    TuiAppearance,
    TuiCardMedium,
    TuiCalendar,
    TuiTextfield,
    TuiLabel,
    TuiTextarea,
    GroupsListComponent,
    IllustratedMessageComponent,
  ],
  templateUrl: './book-coaching-page.component.html',
  styleUrl: './book-coaching-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookCoachingPageComponent implements OnInit {
  private readonly groupsService = inject(GroupsService);
  private readonly coachingService = inject(CoachingService);
  private readonly router = inject(Router);
  private readonly alerts = inject(TuiAlertService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected activeIndex = 0;
  protected slideDirection = 1;

  // Step 1
  protected groups = signal<Group[]>([]);
  protected groupsLoading = signal(true);
  protected selectedGroup: Group | null = null;

  // Step 2
  protected experts = signal<ExpertInfo[]>([]);
  protected expertsLoading = signal(false);
  protected selectedExpert: ExpertInfo | null = null;

  // Step 3 (Session Type)
  protected sessionTypes = signal<SessionType[]>([]);
  protected sessionTypesLoading = signal(false);
  protected selectedSessionType: SessionType | null = null;

  // Step 4 (Slot)
  protected slots = signal<CoachingSlot[]>([]);
  protected slotsLoading = signal(false);
  protected slotsByDate = signal<Map<string, CoachingSlot[]>>(new Map());
  protected selectedSlot: CoachingSlot | null = null;
  protected selectedCalendarDate: TuiDay | null = null;
  protected calendarMonth = TuiMonth.currentLocal();
  protected calendarMin = TuiDay.currentLocal();
  protected calendarMax = TuiDay.currentLocal().append({ month: 3 });
  private availableDaySet = new Set<string>();

  @ViewChild('slotsPanel') private slotsPanel?: ElementRef<HTMLElement>;

  // Step 5 (Confirm)
  protected notes = '';
  protected booking = false;
  protected booked = false;

  ngOnInit(): void {
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

  protected onGroupSelect(groupId: string): void {
    const group = this.groups().find((g) => g.id === groupId);
    if (group) this.selectGroup(group);
  }

  protected onNext(): void {
    this.slideDirection = 1;
    this.activeIndex++;
    this.cdr.markForCheck();
  }

  protected onActiveIndexChange(index: number): void {
    this.slideDirection = index > this.activeIndex ? 1 : -1;
    this.activeIndex = index;
  }

  protected onBack(): void {
    this.slideDirection = -1;
    this.activeIndex--;
    this.cdr.markForCheck();
  }

  protected selectGroup(group: Group): void {
    this.selectedGroup = group;
    this.expertsLoading.set(true);
    this.experts.set([]);
    this.onNext();
    this.coachingService.listExperts(group.id).subscribe({
      next: (experts) => {
        this.expertsLoading.set(false);
        this.experts.set(experts ?? []);
        this.cdr.markForCheck();
      },
      error: () => {
        this.expertsLoading.set(false);
        this.cdr.markForCheck();
        this.alerts.open('Failed to load experts', { appearance: 'negative' }).subscribe();
      },
    });
  }

  protected selectExpert(expert: ExpertInfo): void {
    this.selectedExpert = expert;
    this.sessionTypesLoading.set(true);
    this.sessionTypes.set([]);
    this.slideDirection = 1;
    this.activeIndex = 2;
    this.cdr.markForCheck();
    this.loadSessionTypes();
  }

  private loadSessionTypes(): void {
    if (!this.selectedGroup) return;
    this.coachingService.listSessionTypes(this.selectedGroup.id).subscribe({
      next: (types) => {
        this.sessionTypesLoading.set(false);
        this.sessionTypes.set((types ?? []).filter((t) => t.is_active));
        this.cdr.markForCheck();
      },
      error: () => {
        this.sessionTypesLoading.set(false);
        this.cdr.markForCheck();
        this.alerts.open('Failed to load session types', { appearance: 'negative' }).subscribe();
      },
    });
  }

  protected selectSessionType(type: SessionType): void {
    this.selectedSessionType = type;
    this.slotsLoading.set(true);
    this.slots.set([]);
    this.slotsByDate.set(new Map());
    this.selectedCalendarDate = null;
    this.availableDaySet = new Set();
    this.slideDirection = 1;
    this.activeIndex = 3;
    this.cdr.markForCheck();
    this.loadSlots();
  }

  private loadSlots(): void {
    if (!this.selectedGroup || !this.selectedExpert || !this.selectedSessionType) return;
    this.coachingService
      .listAvailableSlots(
        this.selectedGroup.id,
        this.selectedExpert.expert_id,
        this.selectedSessionType.id,
      )
      .subscribe({
        next: (slots) => {
          this.slotsLoading.set(false);
          this.slots.set(slots ?? []);
          this.slotsByDate.set(this.groupSlotsByDate(slots ?? []));
          this.cdr.markForCheck();
        },
        error: () => {
          this.slotsLoading.set(false);
          this.cdr.markForCheck();
          this.alerts
            .open('Failed to load available slots', { appearance: 'negative' })
            .subscribe();
        },
      });
  }

  private groupSlotsByDate(slots: CoachingSlot[]): Map<string, CoachingSlot[]> {
    const map = new Map<string, CoachingSlot[]>();
    const daySet = new Set<string>();
    for (const slot of slots) {
      const d = new Date(slot.starts_at);
      const dateKey = this.toDateKey(d);
      daySet.add(dateKey);
      const label = d.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
      const existing = map.get(dateKey) ?? [];
      existing.push(slot);
      map.set(dateKey, existing);
    }
    this.availableDaySet = daySet;

    // Set calendar bounds to the range of available slots
    if (slots.length > 0) {
      const first = new Date(slots[0].starts_at);
      const last = new Date(slots[slots.length - 1].starts_at);
      this.calendarMin = TuiDay.fromLocalNativeDate(first);
      this.calendarMax = TuiDay.fromLocalNativeDate(last);
      this.calendarMonth = new TuiMonth(first.getFullYear(), first.getMonth());
    }

    return map;
  }

  private toDateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  protected readonly disabledDayHandler = (day: TuiDay): boolean => {
    const key = `${day.year}-${String(day.month + 1).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
    return !this.availableDaySet.has(key);
  };

  protected readonly markerHandler = (day: TuiDay): [] | [string] => {
    const key = `${day.year}-${String(day.month + 1).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
    return this.availableDaySet.has(key) ? ['var(--tui-status-positive)'] : [];
  };

  protected onDayClick(day: TuiDay): void {
    this.selectedCalendarDate = day;
    this.cdr.markForCheck();
    // On mobile, scroll to slots panel
    setTimeout(() => {
      this.slotsPanel?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  protected get slotsForSelectedDate(): CoachingSlot[] {
    if (!this.selectedCalendarDate) return [];
    const key = `${this.selectedCalendarDate.year}-${String(this.selectedCalendarDate.month + 1).padStart(2, '0')}-${String(this.selectedCalendarDate.day).padStart(2, '0')}`;
    return this.slotsByDate().get(key) ?? [];
  }

  protected get selectedDateLabel(): string {
    if (!this.selectedCalendarDate) return '';
    const d = this.selectedCalendarDate.toLocalNativeDate();
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  protected selectSlot(slot: CoachingSlot): void {
    this.selectedSlot = slot;
    this.onNext(); // go to confirm (step 4)
  }

  protected formatTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected formatSlotDateTime(slot: CoachingSlot): string {
    const start = new Date(slot.starts_at);
    return (
      start.toLocaleString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ` – ${this.formatTime(slot.ends_at)} (your local time)`
    );
  }

  protected get selectedExpertName(): string {
    if (!this.selectedExpert) return '';
    return `${this.selectedExpert.first_name} ${this.selectedExpert.last_name}`.trim() || 'Expert';
  }

  protected expertAvatarSrc(expert: ExpertInfo): string {
    if (!expert.avatar) return '@tui.user-round';
    if (expert.avatar.startsWith('http') || expert.avatar.startsWith('data:')) {
      return expert.avatar;
    }
    return `data:image/jpeg;base64,${expert.avatar}`;
  }

  protected confirmBooking(): void {
    if (
      !this.selectedGroup ||
      !this.selectedExpert ||
      !this.selectedSlot ||
      !this.selectedSessionType
    )
      return;
    this.booking = true;
    this.cdr.markForCheck();

    this.coachingService
      .createBooking(this.selectedGroup.id, {
        expert_id: this.selectedExpert.expert_id,
        session_type_id: this.selectedSessionType.id,
        scheduled_at: this.selectedSlot.starts_at,
        notes: this.notes || undefined,
      })
      .subscribe({
        next: () => {
          this.booked = true;
          this.booking = false;
          this.cdr.markForCheck();
          setTimeout(() => this.router.navigate(['/sessions']), 1500);
        },
        error: (err) => {
          this.booking = false;
          this.cdr.markForCheck();
          const msg =
            err.status === 409
              ? 'That slot was just taken. Please choose another.'
              : 'Failed to book session. Please try again.';
          this.alerts.open(msg, { appearance: 'negative' }).subscribe();
          if (err.status === 409) {
            // Refresh slots
            this.loadSlots();
            this.selectedSlot = null;
            this.cdr.markForCheck();
          }
        },
      });
  }
}
