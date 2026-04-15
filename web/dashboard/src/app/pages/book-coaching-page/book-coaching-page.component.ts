import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TuiAlertService, TuiButton } from '@taiga-ui/core';
import { TuiAvatar, TuiSlides, TuiStep, TuiStepper } from '@taiga-ui/kit';
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
  protected loading = signal(false);

  // Step 1
  protected groups = signal<Group[]>([]);
  protected selectedGroup: Group | null = null;

  // Step 2
  protected experts = signal<ExpertInfo[]>([]);
  protected selectedExpert: ExpertInfo | null = null;
  protected expertSkipped = false;

  // Step 3 (Session Type)
  protected sessionTypes = signal<SessionType[]>([]);
  protected selectedSessionType: SessionType | null = null;

  // Step 4 (Slot)
  protected slots = signal<CoachingSlot[]>([]);
  protected slotsByDate = signal<Map<string, CoachingSlot[]>>(new Map());
  protected selectedSlot: CoachingSlot | null = null;

  // Step 5 (Confirm)
  protected notes = '';
  protected booking = false;
  protected booked = false;

  ngOnInit(): void {
    this.groupsService.list().subscribe({
      next: (groups) => {
        this.groups.set(groups ?? []);
        this.cdr.markForCheck();
      },
    });
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
    this.loading.set(true);
    this.cdr.markForCheck();
    this.coachingService.listExperts(group.id).subscribe({
      next: (experts) => {
        this.loading.set(false);
        this.experts.set(experts ?? []);
        if (experts.length === 1) {
          // Auto-skip expert selection
          this.selectedExpert = experts[0];
          this.expertSkipped = true;
          this.loadSessionTypes();
        } else {
          this.expertSkipped = false;
          this.onNext(); // go to expert selection (step 1)
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
        this.alerts.open('Failed to load experts', { appearance: 'negative' }).subscribe();
      },
    });
  }

  protected selectExpert(expert: ExpertInfo): void {
    this.selectedExpert = expert;
    this.loadSessionTypes();
  }

  private loadSessionTypes(): void {
    if (!this.selectedGroup) return;
    this.loading.set(true);
    this.cdr.markForCheck();
    this.coachingService.listSessionTypes(this.selectedGroup.id).subscribe({
      next: (types) => {
        this.loading.set(false);
        this.sessionTypes.set((types ?? []).filter((t) => t.is_active));
        this.slideDirection = 1;
        this.activeIndex = 2; // jump to session type step
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
        this.alerts.open('Failed to load session types', { appearance: 'negative' }).subscribe();
      },
    });
  }

  protected selectSessionType(type: SessionType): void {
    this.selectedSessionType = type;
    this.loadSlots();
  }

  private loadSlots(): void {
    if (!this.selectedGroup || !this.selectedExpert || !this.selectedSessionType) return;
    this.loading.set(true);
    this.cdr.markForCheck();
    this.coachingService
      .listAvailableSlots(
        this.selectedGroup.id,
        this.selectedExpert.expert_id,
        this.selectedSessionType.id,
      )
      .subscribe({
        next: (slots) => {
          this.loading.set(false);
          this.slots.set(slots ?? []);
          this.slotsByDate.set(this.groupSlotsByDate(slots ?? []));
          this.slideDirection = 1;
          this.activeIndex = 3; // jump to slot step
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading.set(false);
          this.cdr.markForCheck();
          this.alerts
            .open('Failed to load available slots', { appearance: 'negative' })
            .subscribe();
        },
      });
  }

  private groupSlotsByDate(slots: CoachingSlot[]): Map<string, CoachingSlot[]> {
    const map = new Map<string, CoachingSlot[]>();
    for (const slot of slots) {
      const date = new Date(slot.starts_at).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
      const existing = map.get(date) ?? [];
      existing.push(slot);
      map.set(date, existing);
    }
    return map;
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

  protected groupAvatarSrc(group: Group): string {
    if (!group.avatar) return '@tui.users';
    return group.avatar.startsWith('data:')
      ? group.avatar
      : `data:image/jpeg;base64,${group.avatar}`;
  }

  protected get selectedExpertName(): string {
    if (!this.selectedExpert) return '';
    return `${this.selectedExpert.first_name} ${this.selectedExpert.last_name}`.trim() || 'Expert';
  }

  protected expertAvatarSrc(expert: ExpertInfo): string {
    if (!expert.avatar) return '@tui.user-round';
    return expert.avatar.startsWith('data:')
      ? expert.avatar
      : `data:image/jpeg;base64,${expert.avatar}`;
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

  protected get slotDates(): string[] {
    return Array.from(this.slotsByDate().keys());
  }
}
