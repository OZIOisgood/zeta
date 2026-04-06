import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TuiAlertService, TuiButton, TuiTextfield } from '@taiga-ui/core';
import { TuiDataListWrapper, TuiSelect } from '@taiga-ui/kit';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import {
  CoachingAvailability,
  CoachingBlockedSlot,
  CoachingService,
} from '../../shared/services/coaching.service';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DURATION_OPTIONS = [15, 30, 45, 60];

@Component({
  selector: 'app-manage-availability-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PageContainerComponent,
    TuiButton,
    TuiTextfield,
    TuiSelect,
    TuiDataListWrapper,
  ],
  templateUrl: './manage-availability-page.component.html',
  styleUrls: ['./manage-availability-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageAvailabilityPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly coachingService = inject(CoachingService);
  private readonly alerts = inject(TuiAlertService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected groupId = '';
  protected loading = signal(true);
  protected availability = signal<CoachingAvailability[]>([]);
  protected blockedSlots = signal<CoachingBlockedSlot[]>([]);
  protected userTimezone = signal('UTC');
  protected readonly dayNames = DAY_NAMES;
  protected readonly durationOptions = DURATION_OPTIONS;

  // Add availability form
  protected showAddForm = false;
  protected newDayOfWeek = 1;
  protected newStartTime = '09:00';
  protected newEndTime = '17:00';
  protected newDuration = 30;

  // Block time form
  protected showBlockForm = false;
  protected newBlockDate = '';
  protected newBlockStartTime = '';
  protected newBlockEndTime = '';
  protected newBlockReason = '';
  protected newBlockFullDay = true;

  // Editing
  protected editingId: string | null = null;
  protected editDayOfWeek = 1;
  protected editStartTime = '';
  protected editEndTime = '';
  protected editDuration = 30;

  ngOnInit(): void {
    this.groupId = this.route.snapshot.paramMap.get('groupID') ?? '';
    this.coachingService.getMyTimezone().subscribe({
      next: (res) => {
        this.userTimezone.set(res.timezone);
        this.cdr.markForCheck();
      },
    });
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);
    this.coachingService.listMyAvailability(this.groupId).subscribe({
      next: (avail) => {
        this.availability.set(avail ?? []);
        this.loadBlockedSlots();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  private loadBlockedSlots(): void {
    this.coachingService.listBlockedSlots(this.groupId).subscribe({
      next: (slots) => {
        this.blockedSlots.set(slots ?? []);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  protected dayName(dow: number): string {
    return DAY_NAMES[dow] ?? '';
  }

  protected addAvailability(): void {
    this.coachingService
      .createAvailability(this.groupId, {
        day_of_week: this.newDayOfWeek,
        start_time: this.newStartTime,
        end_time: this.newEndTime,
        slot_duration_minutes: this.newDuration,
      })
      .subscribe({
        next: () => {
          this.showAddForm = false;
          this.loadData();
        },
        error: () => {
          this.alerts
            .open('Failed to add availability block', { appearance: 'negative' })
            .subscribe();
        },
      });
  }

  protected startEdit(a: CoachingAvailability): void {
    this.editingId = a.id;
    this.editDayOfWeek = a.day_of_week;
    this.editStartTime = a.start_time;
    this.editEndTime = a.end_time;
    this.editDuration = a.slot_duration_minutes;
    this.cdr.markForCheck();
  }

  protected saveEdit(): void {
    if (!this.editingId) return;
    this.coachingService
      .updateAvailability(this.groupId, this.editingId, {
        day_of_week: this.editDayOfWeek,
        start_time: this.editStartTime,
        end_time: this.editEndTime,
        slot_duration_minutes: this.editDuration,
      })
      .subscribe({
        next: () => {
          this.editingId = null;
          this.loadData();
        },
        error: () => {
          this.alerts
            .open('Failed to update availability block', { appearance: 'negative' })
            .subscribe();
        },
      });
  }

  protected cancelEdit(): void {
    this.editingId = null;
    this.cdr.markForCheck();
  }

  protected deleteAvailability(id: string): void {
    this.coachingService.deleteAvailability(this.groupId, id).subscribe({
      next: () => this.loadData(),
      error: () => {
        this.alerts
          .open('Failed to delete availability block', { appearance: 'negative' })
          .subscribe();
      },
    });
  }

  protected addBlockedSlot(): void {
    const data: { blocked_date: string; start_time?: string; end_time?: string; reason?: string } =
      { blocked_date: this.newBlockDate };
    if (!this.newBlockFullDay) {
      data.start_time = this.newBlockStartTime;
      data.end_time = this.newBlockEndTime;
    }
    if (this.newBlockReason) {
      data.reason = this.newBlockReason;
    }
    this.coachingService.createBlockedSlot(this.groupId, data).subscribe({
      next: () => {
        this.showBlockForm = false;
        this.newBlockDate = '';
        this.newBlockStartTime = '';
        this.newBlockEndTime = '';
        this.newBlockReason = '';
        this.newBlockFullDay = true;
        this.loadBlockedSlots();
      },
      error: () => {
        this.alerts.open('Failed to block time', { appearance: 'negative' }).subscribe();
      },
    });
  }

  protected deleteBlockedSlot(id: string): void {
    this.coachingService.deleteBlockedSlot(this.groupId, id).subscribe({
      next: () => this.loadBlockedSlots(),
      error: () => {
        this.alerts.open('Failed to remove blocked slot', { appearance: 'negative' }).subscribe();
      },
    });
  }

  protected goBack(): void {
    this.router.navigate(['/groups', this.groupId]);
  }

  protected formatBlockedDate(isoDate: string): string {
    const [y, m, d] = isoDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  protected saveTimezone(tz: string): void {
    this.coachingService.setMyTimezone(tz).subscribe({
      next: (res) => {
        this.userTimezone.set(res.timezone);
        this.alerts.open('Timezone updated', { appearance: 'positive' }).subscribe();
        this.cdr.markForCheck();
      },
      error: () => {
        this.alerts.open('Invalid timezone', { appearance: 'negative' }).subscribe();
      },
    });
  }
}
