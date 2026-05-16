import { NgClass } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  LucideBell,
  LucideCalendarDays,
  LucideChevronDown,
  LucideHome,
  LucideLanguages,
  LucideLogOut,
  LucideMenu,
  LucideSearch,
  LucideSettings,
  LucideUsers,
  LucideVideo,
  LucideX,
} from '@lucide/angular';
import { filter } from 'rxjs';
import { SessionStore } from '../../features/session/session.store';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZIconButtonComponent } from '../../shared/ui/icon-button/z-icon-button.component';
import { ZSegmentedControlComponent } from '../../shared/ui/segmented-control/z-segmented-control.component';
import { DashboardLocalizationService } from '../i18n/dashboard-localization.service';
import { AppShellStore } from '../state/app-shell.store';

@Component({
  selector: 'app-shell',
  imports: [
    NgClass,
    RouterLink,
    RouterOutlet,
    TranslocoPipe,
    ZButtonComponent,
    ZIconButtonComponent,
    ZSegmentedControlComponent,
    LucideBell,
    LucideCalendarDays,
    LucideChevronDown,
    LucideHome,
    LucideLanguages,
    LucideLogOut,
    LucideMenu,
    LucideSearch,
    LucideSettings,
    LucideUsers,
    LucideVideo,
    LucideX,
  ],
  templateUrl: './shell.html',
})
export class ShellComponent {
  protected readonly shell = inject(AppShellStore);
  protected readonly session = inject(SessionStore);
  protected readonly initials = computed(() => {
    return this.session
      .displayName()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  });
  private readonly localization = inject(DashboardLocalizationService);
  private readonly router = inject(Router);

  constructor() {
    this.shell.setLanguage(this.localization.currentLanguage());
    this.shell.selectSectionForUrl(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.shell.selectSectionForUrl(event.urlAfterRedirects));
  }
}
