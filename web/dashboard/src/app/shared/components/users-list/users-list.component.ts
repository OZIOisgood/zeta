import { AsyncPipe, CommonModule, NgForOf, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { TuiTable } from '@taiga-ui/addon-table';
import {
  TuiAutoColorPipe,
  TuiButton,
  TuiDataList,
  TuiDropdown,
  TuiIcon,
  TuiInitialsPipe,
  TuiTitle,
} from '@taiga-ui/core';
import { TuiAvatar, TuiStatus } from '@taiga-ui/kit';
import { TuiCardLarge, TuiCell } from '@taiga-ui/layout';
import { BehaviorSubject, of, switchMap } from 'rxjs';
import { UsersService } from '../../services/users.service';

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
    TuiStatus,
    TuiTable,
    TuiCardLarge,
    TuiTitle,
  ],
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersListComponent {
  private readonly usersService = inject(UsersService);

  private readonly groupIdSubject = new BehaviorSubject<string | null>(null);

  @Input() set groupId(value: string | null) {
    this.groupIdSubject.next(value);
  }

  readonly users$ = this.groupIdSubject.pipe(
    switchMap((id) => (id ? this.usersService.list(id) : of([]))),
  );

  protected readonly size = 'l';

  getRoleIcon(role: string | undefined): string {
    switch (role) {
      case 'admin':
        return '@tui.user-star';
      case 'expert':
        return '@tui.user-star';
      case 'student':
      default:
        return '@tui.graduation-cap';
    }
  }

  getRoleColor(role: string | undefined): string {
    switch (role) {
      case 'admin':
        return 'var(--tui-status-negative)'; // Red-ish for admin?
      case 'expert':
        return 'var(--tui-status-warning)';
      case 'student':
      default:
        return 'var(--tui-status-info)';
    }
  }

  formatRole(role: string | undefined): string {
    if (!role) return 'Student';
    return role.charAt(0).toUpperCase() + role.slice(1);
  }
}
