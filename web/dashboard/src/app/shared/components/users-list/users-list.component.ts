import { AsyncPipe, CommonModule, NgForOf, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, Input } from '@angular/core';
import { TuiTable } from '@taiga-ui/addon-table';
import {
  TuiAlertService,
  TuiAutoColorPipe,
  TuiButton,
  TuiDataList,
  TuiDialogService,
  TuiDropdown,
  TuiIcon,
  TuiInitialsPipe,
  TuiTitle,
} from '@taiga-ui/core';
import { TUI_CONFIRM, TuiAvatar, TuiSkeleton, type TuiConfirmData } from '@taiga-ui/kit';
import { TuiCardLarge, TuiCell } from '@taiga-ui/layout';
import { BehaviorSubject, filter, of, switchMap } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { PermissionsService } from '../../services/permissions.service';
import { GroupUsersListKind, UsersService } from '../../services/users.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [
    CommonModule,
    NgForOf,
    NgIf,
    AsyncPipe,
    TuiAutoColorPipe,
    TuiAvatar,
    TuiButton,
    TuiCell,
    TuiDataList,
    TuiDropdown,
    TuiIcon,
    TuiInitialsPipe,
    TuiTable,
    TuiCardLarge,
    TuiTitle,
    TuiSkeleton,
  ],
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersListComponent {
  private readonly usersService = inject(UsersService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly auth = inject(AuthService);
  private readonly alerts = inject(TuiAlertService);
  private readonly dialogs = inject(TuiDialogService);

  private readonly groupIdSubject = new BehaviorSubject<string | null>(null);
  private readonly refresh$ = new BehaviorSubject<void>(void 0);

  @Input() set groupId(value: string | null) {
    this.groupIdSubject.next(value);
  }
  @Input() listKind: GroupUsersListKind = 'students';
  @Input() emptyMessage = 'No members in this group yet.';

  readonly users$ = this.refresh$.pipe(
    switchMap(() => this.groupIdSubject),
    switchMap((id) => (id ? this.usersService.list(id, this.listKind) : of([]))),
  );

  readonly canDeleteUsers = computed(() =>
    this.permissionsService.hasPermission('groups:user-list:delete'),
  );

  protected readonly size = 'l';

  isCurrentUser(userId: string): boolean {
    return this.auth.user()?.id === userId;
  }

  removeUser(userId: string, name: string): void {
    const groupId = this.groupIdSubject.getValue();
    if (!groupId) return;

    const data: TuiConfirmData = {
      content: `Are you sure you want to remove ${name} from this group?`,
      yes: 'Remove',
      no: 'Cancel',
      appearance: 'destructive',
    };

    this.dialogs
      .open<boolean>(TUI_CONFIRM, {
        label: 'Remove User',
        size: 's',
        data,
      })
      .pipe(
        filter(Boolean),
        switchMap(() => this.usersService.remove(groupId, userId)),
      )
      .subscribe({
        next: () => {
          this.alerts
            .open(`${name} has been removed from the group`, { appearance: 'positive' })
            .subscribe();
          this.refresh$.next();
        },
        error: (err) => {
          const msg = err?.error || 'Failed to remove user';
          this.alerts.open(msg, { appearance: 'negative' }).subscribe();
        },
      });
  }
}
