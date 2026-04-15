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
import { TuiAlertService, TuiButton, TuiDialogService } from '@taiga-ui/core';
import { TUI_CONFIRM, TuiConfirmData } from '@taiga-ui/kit';
import { filter, switchMap } from 'rxjs';
import {
  BreadcrumbItem,
  BreadcrumbsComponent,
} from '../../shared/components/breadcrumbs/breadcrumbs.component';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import {
  CoachingAvailability,
  CoachingBlockedSlot,
  CoachingService,
  SessionType,
} from '../../shared/services/coaching.service';
import { Group, GroupsService } from '../../shared/services/groups.service';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

@Component({
  selector: 'app-manage-availability-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PageContainerComponent,
    SectionHeaderComponent,
    BreadcrumbsComponent,
    TuiButton,
  ],
  templateUrl: './manage-availability-page.component.html',
  styleUrls: ['./manage-availability-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageAvailabilityPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly coachingService = inject(CoachingService);
  private readonly groupsService = inject(GroupsService);
  private readonly alerts = inject(TuiAlertService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Group selection
  protected groups = signal<Group[]>([]);
  protected selectedGroup: Group | null = null;

  get breadcrumbItems(): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [{ label: 'Sessions', routerLink: '/sessions' }];
    if (this.selectedGroup) {
      items.push({ label: 'Manage Availability', routerLink: '/sessions/settings' });
      items.push({ label: this.selectedGroup.name });
    } else {
      items.push({ label: 'Manage Availability' });
    }
    return items;
  }

  protected groupId = '';
  protected loading = signal(true);
  protected sessionTypes = signal<SessionType[]>([]);
  protected availability = signal<CoachingAvailability[]>([]);
  protected blockedSlots = signal<CoachingBlockedSlot[]>([]);
  protected userTimezone = signal('UTC');
  protected readonly dayNames = DAY_NAMES;
  protected readonly durationOptions = DURATION_OPTIONS;

  // Timezone edit
  protected editingTimezone = false;
  protected timezoneInput = '';

  // Session type forms
  protected showSessionTypeForm = false;
  protected newSessionTypeName = '';
  protected newSessionTypeDescription = '';
  protected newSessionTypeDuration = 30;
  protected editingSessionTypeId: string | null = null;
  protected editSessionTypeName = '';
  protected editSessionTypeDescription = '';
  protected editSessionTypeDuration = 30;

  // Add availability form
  protected showAddForm = false;
  protected newDayOfWeek = 1;
  protected newStartTime = '09:00';
  protected newEndTime = '17:00';

  // Block time form
  protected showBlockForm = false;
  protected newBlockDate = '';
  protected newBlockStartTime = '';
  protected newBlockEndTime = '';
  protected newBlockReason = '';
  protected newBlockFullDay = true;

  // Editing availability
  protected editingId: string | null = null;
  protected editDayOfWeek = 1;
  protected editStartTime = '';
  protected editEndTime = '';

  ngOnInit(): void {
    this.loading.set(true);
    this.groupsService.list().subscribe({
      next: (groups) => {
        this.groups.set(groups ?? []);
        const routeGroupId = this.route.snapshot.paramMap.get('groupId');
        if (routeGroupId) {
          const match = groups.find((g) => g.id === routeGroupId);
          if (match) {
            this.selectedGroup = match;
            this.groupId = match.id;
            this.loadAll();
            return;
          }
        }
        if (groups.length === 1) {
          // Auto-select when only one group — redirect to URL with groupId
          this.router.navigate(['/sessions/settings', groups[0].id], { replaceUrl: true });
        } else {
          this.loading.set(false);
          this.cdr.markForCheck();
        }
      },
      error: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
    this.coachingService.getMyTimezone().subscribe({
      next: (res) => {
        this.userTimezone.set(res.timezone);
        this.cdr.markForCheck();
      },
    });
  }

  protected selectGroup(group: Group): void {
    this.router.navigate(['/sessions/settings', group.id]);
  }

  private loadAll(): void {
    this.loading.set(true);
    this.coachingService.listSessionTypes(this.groupId).subscribe({
      next: (types) => {
        this.sessionTypes.set(types ?? []);
        this.loadData();
      },
      error: () => this.loadData(),
    });
  }

  private loadData(): void {
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

  // Timezone
  protected startEditTimezone(): void {
    this.timezoneInput = this.userTimezone();
    this.editingTimezone = true;
    this.cdr.markForCheck();
  }

  protected cancelEditTimezone(): void {
    this.editingTimezone = false;
    this.cdr.markForCheck();
  }

  protected saveTimezone(): void {
    this.coachingService.setMyTimezone(this.timezoneInput).subscribe({
      next: (res) => {
        this.userTimezone.set(res.timezone);
        this.editingTimezone = false;
        this.alerts.open('Timezone updated', { appearance: 'positive' }).subscribe();
        this.cdr.markForCheck();
      },
      error: () => {
        this.alerts.open('Invalid timezone identifier', { appearance: 'negative' }).subscribe();
      },
    });
  }

  // Session Types
  protected addSessionType(): void {
    this.coachingService
      .createSessionType(this.groupId, {
        name: this.newSessionTypeName,
        description: this.newSessionTypeDescription,
        duration_minutes: this.newSessionTypeDuration,
      })
      .subscribe({
        next: () => {
          this.showSessionTypeForm = false;
          this.newSessionTypeName = '';
          this.newSessionTypeDescription = '';
          this.newSessionTypeDuration = 30;
          this.coachingService.listSessionTypes(this.groupId).subscribe({
            next: (types) => {
              this.sessionTypes.set(types ?? []);
              this.cdr.markForCheck();
            },
          });
        },
        error: () => {
          this.alerts.open('Failed to create session type', { appearance: 'negative' }).subscribe();
        },
      });
  }

  protected startEditSessionType(st: SessionType): void {
    this.editingSessionTypeId = st.id;
    this.editSessionTypeName = st.name;
    this.editSessionTypeDescription = st.description;
    this.editSessionTypeDuration = st.duration_minutes;
    this.cdr.markForCheck();
  }

  protected saveEditSessionType(): void {
    if (!this.editingSessionTypeId) return;
    this.coachingService
      .updateSessionType(this.groupId, this.editingSessionTypeId, {
        name: this.editSessionTypeName,
        description: this.editSessionTypeDescription,
        duration_minutes: this.editSessionTypeDuration,
      })
      .subscribe({
        next: () => {
          this.editingSessionTypeId = null;
          this.coachingService.listSessionTypes(this.groupId).subscribe({
            next: (types) => {
              this.sessionTypes.set(types ?? []);
              this.cdr.markForCheck();
            },
          });
        },
        error: () => {
          this.alerts.open('Failed to update session type', { appearance: 'negative' }).subscribe();
        },
      });
  }

  protected cancelEditSessionType(): void {
    this.editingSessionTypeId = null;
    this.cdr.markForCheck();
  }

  protected deleteSessionType(id: string): void {
    const data: TuiConfirmData = {
      content: 'This action cannot be undone.',
      yes: 'Delete',
      no: 'Cancel',
    };
    this.dialogs
      .open<boolean>(TUI_CONFIRM, { label: 'Delete Session Type', size: 's', data })
      .pipe(
        filter(Boolean),
        switchMap(() => this.coachingService.deleteSessionType(this.groupId, id)),
      )
      .subscribe({
        next: () => {
          this.coachingService.listSessionTypes(this.groupId).subscribe({
            next: (types) => {
              this.sessionTypes.set(types ?? []);
              this.cdr.markForCheck();
            },
          });
        },
        error: () => {
          this.alerts.open('Failed to delete session type', { appearance: 'negative' }).subscribe();
        },
      });
  }

  // Availability
  protected dayName(dow: number): string {
    return DAY_NAMES[dow] ?? '';
  }

  protected addAvailability(): void {
    this.coachingService
      .createAvailability(this.groupId, {
        day_of_week: this.newDayOfWeek,
        start_time: this.newStartTime,
        end_time: this.newEndTime,
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
    this.cdr.markForCheck();
  }

  protected saveEdit(): void {
    if (!this.editingId) return;
    this.coachingService
      .updateAvailability(this.groupId, this.editingId, {
        day_of_week: this.editDayOfWeek,
        start_time: this.editStartTime,
        end_time: this.editEndTime,
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
    const data: TuiConfirmData = {
      content: 'This action cannot be undone.',
      yes: 'Delete',
      no: 'Cancel',
    };
    this.dialogs
      .open<boolean>(TUI_CONFIRM, { label: 'Delete Availability', size: 's', data })
      .pipe(
        filter(Boolean),
        switchMap(() => this.coachingService.deleteAvailability(this.groupId, id)),
      )
      .subscribe({
        next: () => this.loadData(),
        error: () => {
          this.alerts
            .open('Failed to delete availability block', { appearance: 'negative' })
            .subscribe();
        },
      });
  }

  // Blocked slots
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
    const data: TuiConfirmData = {
      content: 'This action cannot be undone.',
      yes: 'Delete',
      no: 'Cancel',
    };
    this.dialogs
      .open<boolean>(TUI_CONFIRM, { label: 'Delete Blocked Date', size: 's', data })
      .pipe(
        filter(Boolean),
        switchMap(() => this.coachingService.deleteBlockedSlot(this.groupId, id)),
      )
      .subscribe({
        next: () => this.loadBlockedSlots(),
        error: () => {
          this.alerts.open('Failed to remove blocked slot', { appearance: 'negative' }).subscribe();
        },
      });
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
}
