import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TuiAlertService, TuiButton, TuiDialogService } from '@taiga-ui/core';
import { TUI_CONFIRM, TuiConfirmData, TuiSkeleton } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { filter, switchMap } from 'rxjs';
import {
  BreadcrumbItem,
  BreadcrumbsComponent,
} from '../../shared/components/breadcrumbs/breadcrumbs.component';
import { GroupsListComponent } from '../../shared/components/groups-list/groups-list.component';
import { IllustratedMessageComponent } from '../../shared/components/illustrated-message/illustrated-message.component';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { AuthService } from '../../shared/services/auth.service';
import {
  CoachingAvailability,
  CoachingBlockedSlot,
  CoachingService,
  SessionType,
} from '../../shared/services/coaching.service';
import { Group, GroupsService } from '../../shared/services/groups.service';
import { PermissionsService } from '../../shared/services/permissions.service';
import { resolveFirstDayOfWeek } from '../../shared/utils/weekdays';
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

const DURATION_OPTIONS = Array.from({ length: 22 }, (_, index) => 15 + index * 5);
type AvailabilityTab = 'session-types' | 'schedule' | 'blocked';

@Component({
  selector: 'app-manage-availability-page',
  standalone: true,
  imports: [
    CommonModule,
    PageContainerComponent,
    SectionHeaderComponent,
    BreadcrumbsComponent,
    IllustratedMessageComponent,
    GroupsListComponent,
    TuiButton,
    TuiSkeleton,
    TranslatePipe,
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
  private readonly permissionsService = inject(PermissionsService);
  private readonly auth = inject(AuthService);
  private readonly alerts = inject(TuiAlertService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly translate = inject(TranslateService);

  // Group selection
  protected groups = signal<Group[]>([]);
  protected selectedGroup: Group | null = null;
  protected canCreateGroup = computed(() => this.permissionsService.hasPermission('groups:create'));
  protected activeTab = signal<AvailabilityTab>('session-types');
  private readonly tabs: AvailabilityTab[] = ['session-types', 'schedule', 'blocked'];

  get breadcrumbItems(): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [{ label: 'sessions.title', routerLink: '/sessions' }];
    if (this.selectedGroup) {
      items.push({ label: 'sessions.availability.title', routerLink: '/sessions/settings' });
      items.push({ label: this.selectedGroup.name });
    } else {
      items.push({ label: 'sessions.availability.title' });
    }
    return items;
  }

  protected groupId = '';
  protected loading = signal(true);
  protected sessionTypes = signal<SessionType[]>([]);
  protected availability = signal<CoachingAvailability[]>([]);
  protected blockedSlots = signal<CoachingBlockedSlot[]>([]);
  protected readonly firstDayOfWeek = computed(() => {
    const user = this.auth.user();

    return resolveFirstDayOfWeek(user?.timezone, user?.language);
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.applyTab(params.get('tab'));
    });

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
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  protected selectGroup(group: Group): void {
    this.router.navigate(['/sessions/settings', group.id]);
  }

  protected onGroupSelect(groupId: string): void {
    this.router.navigate(['/sessions/settings', groupId]);
  }

  protected setTab(tab: AvailabilityTab): void {
    if (!this.selectedGroup) {
      this.activeTab.set(tab);
      return;
    }

    void this.router.navigate(['/sessions', 'settings', this.selectedGroup.id, tab]);
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

  // Session Types
  protected openSessionTypeDialog(sessionType: SessionType | null = null): void {
    this.dialogs
      .open<SessionTypeDialogResult | null>(new PolymorpheusComponent(SessionTypeDialogComponent), {
        label: this.translate.instant(
          sessionType
            ? 'sessions.availability.editSessionType'
            : 'sessions.availability.addSessionType',
        ),
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
                .open(this.translate.instant('sessions.availability.failedUpdateSessionType'), {
                  appearance: 'negative',
                })
                .subscribe();
            },
          });
        } else {
          this.coachingService.createSessionType(this.groupId, result).subscribe({
            next: () => this.refreshSessionTypes(),
            error: () => {
              this.alerts
                .open(this.translate.instant('sessions.availability.failedCreateSessionType'), {
                  appearance: 'negative',
                })
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
      content: this.translate.instant('sessions.availability.confirmDelete'),
      yes: this.translate.instant('common.actions.delete'),
      no: this.translate.instant('common.actions.cancel'),
      appearance: 'destructive',
    };
    this.dialogs
      .open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('sessions.availability.deleteSessionType'),
        size: 's',
        data,
      })
      .pipe(
        filter(Boolean),
        switchMap(() => this.coachingService.deleteSessionType(this.groupId, id)),
      )
      .subscribe({
        next: () => this.refreshSessionTypes(),
        error: () => {
          this.alerts
            .open(this.translate.instant('sessions.availability.failedDeleteSessionType'), {
              appearance: 'negative',
            })
            .subscribe();
        },
      });
  }

  // Availability
  protected dayName(dow: number): string {
    return this.translate.instant(`weekdays.${dow}`);
  }

  protected openAvailabilityDialog(availability: CoachingAvailability | null = null): void {
    this.dialogs
      .open<AvailabilityDialogResult | null>(
        new PolymorpheusComponent(AvailabilityDialogComponent),
        {
          label: this.translate.instant(
            availability
              ? 'sessions.availability.editAvailability'
              : 'sessions.availability.addAvailability',
          ),
          size: 's',
          data: { availability, firstDayOfWeek: this.firstDayOfWeek() },
        },
      )
      .subscribe((result) => {
        if (!result) return;

        if (availability) {
          this.coachingService.updateAvailability(this.groupId, availability.id, result).subscribe({
            next: () => this.loadData(),
            error: () => {
              this.alerts
                .open(this.translate.instant('sessions.availability.failedUpdateAvailability'), {
                  appearance: 'negative',
                })
                .subscribe();
            },
          });
        } else {
          this.coachingService.createAvailability(this.groupId, result).subscribe({
            next: () => this.loadData(),
            error: () => {
              this.alerts
                .open(this.translate.instant('sessions.availability.failedAddAvailability'), {
                  appearance: 'negative',
                })
                .subscribe();
            },
          });
        }
      });
  }

  protected deleteAvailability(id: string): void {
    const data: TuiConfirmData = {
      content: this.translate.instant('sessions.availability.confirmDelete'),
      yes: this.translate.instant('common.actions.delete'),
      no: this.translate.instant('common.actions.cancel'),
      appearance: 'destructive',
    };
    this.dialogs
      .open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('sessions.availability.deleteAvailability'),
        size: 's',
        data,
      })
      .pipe(
        filter(Boolean),
        switchMap(() => this.coachingService.deleteAvailability(this.groupId, id)),
      )
      .subscribe({
        next: () => this.loadData(),
        error: () => {
          this.alerts
            .open(this.translate.instant('sessions.availability.failedDeleteAvailability'), {
              appearance: 'negative',
            })
            .subscribe();
        },
      });
  }

  // Blocked slots
  protected openBlockedSlotDialog(): void {
    this.dialogs
      .open<BlockedSlotDialogResult | null>(new PolymorpheusComponent(BlockedSlotDialogComponent), {
        label: this.translate.instant('sessions.availability.blockTime'),
        size: 's',
      })
      .subscribe((result) => {
        if (!result) return;

        this.coachingService.createBlockedSlot(this.groupId, result).subscribe({
          next: () => this.loadBlockedSlots(),
          error: () => {
            this.alerts
              .open(this.translate.instant('sessions.availability.failedBlockTime'), {
                appearance: 'negative',
              })
              .subscribe();
          },
        });
      });
  }

  protected deleteBlockedSlot(id: string): void {
    const data: TuiConfirmData = {
      content: this.translate.instant('sessions.availability.confirmDelete'),
      yes: this.translate.instant('common.actions.delete'),
      no: this.translate.instant('common.actions.cancel'),
      appearance: 'destructive',
    };
    this.dialogs
      .open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('sessions.availability.deleteBlockedDate'),
        size: 's',
        data,
      })
      .pipe(
        filter(Boolean),
        switchMap(() => this.coachingService.deleteBlockedSlot(this.groupId, id)),
      )
      .subscribe({
        next: () => this.loadBlockedSlots(),
        error: () => {
          this.alerts
            .open(this.translate.instant('sessions.availability.failedRemoveBlocked'), {
              appearance: 'negative',
            })
            .subscribe();
        },
      });
  }

  protected formatBlockedDate(isoDate: string): string {
    const [y, m, d] = isoDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString(this.translate.currentLang || undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private applyTab(tab: string | null): void {
    if (!this.isTab(tab)) {
      const groupID = this.route.snapshot.paramMap.get('groupId');

      if (groupID) {
        void this.router.navigate(['/sessions', 'settings', groupID, this.tabs[0]], {
          replaceUrl: true,
        });
      }

      return;
    }

    this.activeTab.set(tab);
  }

  private isTab(tab: string | null): tab is AvailabilityTab {
    return this.tabs.includes(tab as AvailabilityTab);
  }
}
