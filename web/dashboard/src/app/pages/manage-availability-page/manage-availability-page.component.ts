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
import { ActivatedRoute, Router } from '@angular/router';
import { TuiAlertService, TuiButton, TuiDialogService } from '@taiga-ui/core';
import { TUI_CONFIRM, TuiConfirmData } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { filter, switchMap } from 'rxjs';
import {
  BreadcrumbItem,
  BreadcrumbsComponent,
} from '../../shared/components/breadcrumbs/breadcrumbs.component';
import { IllustratedMessageComponent } from '../../shared/components/illustrated-message/illustrated-message.component';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import {
  CoachingAvailability,
  CoachingBlockedSlot,
  CoachingService,
  SessionType,
} from '../../shared/services/coaching.service';
import { Group, GroupsService } from '../../shared/services/groups.service';
import {
  AvailabilityDialogComponent,
  AvailabilityDialogResult,
} from './ui/availability-dialog/availability-dialog.component';
import {
  BlockedSlotDialogComponent,
  BlockedSlotDialogResult,
} from './ui/blocked-slot-dialog/blocked-slot-dialog.component';
import {
  SessionTypeDialogComponent,
  SessionTypeDialogResult,
} from './ui/session-type-dialog/session-type-dialog.component';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

@Component({
  selector: 'app-manage-availability-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageContainerComponent,
    SectionHeaderComponent,
    BreadcrumbsComponent,
    IllustratedMessageComponent,
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
  protected activeTab = signal<'session-types' | 'schedule' | 'blocked'>('session-types');

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

  // Timezone edit
  protected editingTimezone = false;
  protected timezoneInput = '';

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

  protected setTab(tab: 'session-types' | 'schedule' | 'blocked'): void {
    this.activeTab.set(tab);
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
  protected openSessionTypeDialog(sessionType: SessionType | null = null): void {
    this.dialogs
      .open<SessionTypeDialogResult | null>(new PolymorpheusComponent(SessionTypeDialogComponent), {
        label: sessionType ? 'Edit Session Type' : 'Add Session Type',
        size: 's',
        data: { sessionType, durationOptions: DURATION_OPTIONS },
      })
      .subscribe((result) => {
        if (!result) return;

        if (sessionType) {
          this.coachingService.updateSessionType(this.groupId, sessionType.id, result).subscribe({
            next: () => this.refreshSessionTypes(),
            error: () => {
              this.alerts
                .open('Failed to update session type', { appearance: 'negative' })
                .subscribe();
            },
          });
        } else {
          this.coachingService.createSessionType(this.groupId, result).subscribe({
            next: () => this.refreshSessionTypes(),
            error: () => {
              this.alerts
                .open('Failed to create session type', { appearance: 'negative' })
                .subscribe();
            },
          });
        }
      });
  }

  private refreshSessionTypes(): void {
    this.coachingService.listSessionTypes(this.groupId).subscribe({
      next: (types) => {
        this.sessionTypes.set(types ?? []);
        this.cdr.markForCheck();
      },
    });
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
        next: () => this.refreshSessionTypes(),
        error: () => {
          this.alerts.open('Failed to delete session type', { appearance: 'negative' }).subscribe();
        },
      });
  }

  // Availability
  protected dayName(dow: number): string {
    return DAY_NAMES[dow] ?? '';
  }

  protected openAvailabilityDialog(availability: CoachingAvailability | null = null): void {
    this.dialogs
      .open<AvailabilityDialogResult | null>(
        new PolymorpheusComponent(AvailabilityDialogComponent),
        {
          label: availability ? 'Edit Availability' : 'Add Availability',
          size: 's',
          data: { availability },
        },
      )
      .subscribe((result) => {
        if (!result) return;

        if (availability) {
          this.coachingService.updateAvailability(this.groupId, availability.id, result).subscribe({
            next: () => this.loadData(),
            error: () => {
              this.alerts
                .open('Failed to update availability block', { appearance: 'negative' })
                .subscribe();
            },
          });
        } else {
          this.coachingService.createAvailability(this.groupId, result).subscribe({
            next: () => this.loadData(),
            error: () => {
              this.alerts
                .open('Failed to add availability block', { appearance: 'negative' })
                .subscribe();
            },
          });
        }
      });
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
  protected openBlockedSlotDialog(): void {
    this.dialogs
      .open<BlockedSlotDialogResult | null>(new PolymorpheusComponent(BlockedSlotDialogComponent), {
        label: 'Block Time',
        size: 's',
      })
      .subscribe((result) => {
        if (!result) return;

        this.coachingService.createBlockedSlot(this.groupId, result).subscribe({
          next: () => this.loadBlockedSlots(),
          error: () => {
            this.alerts.open('Failed to block time', { appearance: 'negative' }).subscribe();
          },
        });
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
