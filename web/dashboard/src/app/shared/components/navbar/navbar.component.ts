import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  TuiAutoColorPipe,
  TuiButton,
  TuiDataList,
  TuiDialogService,
  TuiDropdown,
  TuiIcon,
} from '@taiga-ui/core';
import { TuiAvatar, TuiTabs } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { take } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { PermissionsService } from '../../services/permissions.service';
import { DrawerComponent } from '../drawer/drawer.component';
import { PreferencesDialogComponent } from '../preferences-dialog/preferences-dialog.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    TuiButton,
    TuiAvatar,
    TuiDropdown,
    TuiDataList,
    TuiIcon,
    TuiAutoColorPipe,
    TuiTabs,
    DrawerComponent,
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  private readonly auth = inject(AuthService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly dialogs = inject(TuiDialogService);

  protected readonly mobileMenuOpen = signal(false);

  protected readonly showGroups = computed(() =>
    this.permissionsService.hasPermission('groups:read'),
  );
  protected readonly showUploadVideo = computed(() =>
    this.permissionsService.hasPermission('assets:create'),
  );
  protected readonly showBookCoaching = computed(() =>
    this.permissionsService.hasPermission('coaching:book'),
  );
  protected readonly showMySessions = computed(() =>
    this.permissionsService.hasPermission('coaching:bookings:read'),
  );

  protected readonly user = this.auth.user;

  protected readonly userAvatar = computed(() => {
    const user = this.user();
    if (!user) {
      return '';
    }

    const url = user.avatar;
    return url.startsWith('http') || url.startsWith('data:')
      ? url
      : `data:image/jpeg;base64,${url}`;
  });

  protected openPreferences(): void {
    this.mobileMenuOpen.set(false);
    this.dialogs
      .open(new PolymorpheusComponent(PreferencesDialogComponent), {
        label: 'Preferences',
        size: 'm',
      })
      .pipe(take(1))
      .subscribe();
  }

  protected logout(): void {
    this.auth.logout();
  }
}
