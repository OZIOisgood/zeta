import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
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
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  private readonly auth = inject(AuthService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly dialogs = inject(TuiDialogService);

  protected readonly showGroups = computed(() =>
    this.permissionsService.hasPermission('groups:read'),
  );
  protected readonly showUploadVideo = computed(() =>
    this.permissionsService.hasPermission('assets:create'),
  );

  protected readonly user = this.auth.user;

  protected readonly userAvatar = computed(() => {
    const user = this.user();
    if (!user) {
      return '';
    }

    if (user.profile_picture_url) {
      return user.profile_picture_url;
    }

    if (user.first_name && user.last_name) {
      return (user.first_name[0] + user.last_name[0]).toUpperCase();
    }

    return user.email.slice(0, 2).toUpperCase();
  });

  protected openPreferences(): void {
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
