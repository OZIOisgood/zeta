import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  TuiAutoColorPipe,
  TuiButton,
  TuiDataList,
  TuiDropdown,
  TuiIcon,
} from '@taiga-ui/core';
import { TuiAvatar, TuiTabs } from '@taiga-ui/kit';
import { AuthService } from '../../services/auth.service';
import { PermissionsService } from '../../services/permissions.service';
import { DrawerComponent } from '../drawer/drawer.component';

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
  private readonly router = inject(Router);

  protected readonly mobileMenuOpen = signal(false);
  protected readonly userDropdownOpen = signal(false);

  protected readonly showGroups = computed(() =>
    this.permissionsService.hasPermission('groups:read'),
  );
  protected readonly showSessions = computed(() =>
    this.permissionsService.hasPermission('coaching:bookings:read'),
  );

  protected readonly user = this.auth.user;

  protected readonly userAvatar = computed(() => {
    const user = this.user();
    if (!user) {
      return '';
    }

    const avatar = user.avatar;
    if (!avatar || avatar.startsWith('data:')) {
      return avatar;
    }
    return `data:image/jpeg;base64,${avatar}`;
  });

  protected openPreferences(): void {
    this.mobileMenuOpen.set(false);
    this.userDropdownOpen.set(false);
    this.router.navigate(['/preferences']);
  }

  protected logout(): void {
    this.auth.logout();
  }
}
