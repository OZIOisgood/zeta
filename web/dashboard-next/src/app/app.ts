import { NgClass } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import {
  LucideArrowRight,
  LucideBell,
  LucideCalendarDays,
  LucideChevronDown,
  LucideHome,
  LucideLanguages,
  LucideMenu,
  LucideSearch,
  LucideSettings,
  LucideSparkles,
  LucideUpload,
  LucideUsers,
  LucideVideo,
  LucideX,
} from '@lucide/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { AppShellStore } from './core/state/app-shell.store';
import { ZBadgeComponent } from './shared/ui/badge/z-badge.component';
import { ZButtonComponent } from './shared/ui/button/z-button.component';
import { ZEmptyStateComponent } from './shared/ui/empty-state/z-empty-state.component';
import { ZIconButtonComponent } from './shared/ui/icon-button/z-icon-button.component';
import { ZSegmentedControlComponent } from './shared/ui/segmented-control/z-segmented-control.component';
import { ZSkeletonComponent } from './shared/ui/skeleton/z-skeleton.component';
import { ZToastComponent } from './shared/ui/toast/z-toast.component';

@Component({
  selector: 'app-root',
  imports: [
    NgClass,
    RouterLink,
    RouterOutlet,
    TranslocoPipe,
    ZBadgeComponent,
    ZButtonComponent,
    ZEmptyStateComponent,
    ZIconButtonComponent,
    ZSegmentedControlComponent,
    ZSkeletonComponent,
    ZToastComponent,
    LucideArrowRight,
    LucideBell,
    LucideCalendarDays,
    LucideChevronDown,
    LucideHome,
    LucideLanguages,
    LucideMenu,
    LucideSearch,
    LucideSettings,
    LucideSparkles,
    LucideUpload,
    LucideUsers,
    LucideVideo,
    LucideX,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly shell = inject(AppShellStore);
}
