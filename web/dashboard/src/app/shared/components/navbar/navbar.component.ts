import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TuiAutoColorPipe, TuiButton, TuiDataList, TuiDropdown, TuiIcon } from '@taiga-ui/core';
import { TuiAvatar, TuiTabs } from '@taiga-ui/kit';
import { AuthService } from '../../services/auth.service';
import { FeatureService } from '../../services/feature.service';

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
  private readonly featureService = inject(FeatureService);

  protected readonly showGroups = computed(() => this.featureService.features().includes('groups'));
  protected readonly showUploadVideo = computed(() =>
    this.featureService.features().includes('create-asset'),
  );

  protected readonly user = this.auth.user;

  protected readonly userAvatar = computed(() => {
    const user = this.user();
    if (!user) {
      return '';
    }

    if (user.profilePictureUrl) {
      return user.profilePictureUrl;
    }

    if (user.name) {
      const parts = user.name.split(' ').filter((part) => part.length > 0);
      if (parts.length > 1) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      if (parts.length === 1) {
        return parts[0][0].toUpperCase();
      }
    }

    return user.email.slice(0, 2).toUpperCase();
  });

  protected logout(): void {
    this.auth.logout();
  }
}
