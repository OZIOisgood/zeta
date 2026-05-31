import { NgClass } from '@angular/common';
import { Component, ElementRef, HostListener, computed, effect, inject, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  LucideCalendarDays,
  LucideChevronDown,
  LucideHome,
  LucideLogOut,
  LucideMenu,
  LucideSettings,
  LucideUsers,
  LucideVideo,
  LucideX,
} from '@lucide/angular';
import { filter } from 'rxjs';
import { SessionStore } from '../../features/session/session.store';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZIconButtonComponent } from '../../shared/ui/icon-button/z-icon-button.component';
import { ZToastComponent } from '../../shared/ui/toast/z-toast.component';
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
    ZToastComponent,
    LucideCalendarDays,
    LucideChevronDown,
    LucideHome,
    LucideLogOut,
    LucideMenu,
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
  private readonly userMenu = viewChild<ElementRef<HTMLElement>>('userMenu');
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
    effect(() => {
      this.shell.setLanguage(this.localization.currentLanguage());
    });
    this.shell.selectSectionForUrl(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.shell.selectSectionForUrl(event.urlAfterRedirects);
        this.shell.closeUserMenu();
      });
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.shell.isUserMenuOpen()) return;
    const target = event.target as Node | null;
    const menu = this.userMenu()?.nativeElement;
    if (target && menu && !menu.contains(target)) {
      this.shell.closeUserMenu();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.shell.closeUserMenu();
  }
}
