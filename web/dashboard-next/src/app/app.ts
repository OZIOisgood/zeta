import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import {
  LucideArrowRight,
  LucideCalendarDays,
  LucideSparkles,
  LucideUpload,
  LucideUsers,
  LucideVideo,
} from '@lucide/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { AppShellStore } from './core/state/app-shell.store';
import { ZButtonComponent } from './shared/ui/button/z-button.component';
import { ZSkeletonComponent } from './shared/ui/skeleton/z-skeleton.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterLink,
    RouterOutlet,
    TranslocoPipe,
    ZButtonComponent,
    ZSkeletonComponent,
    LucideArrowRight,
    LucideCalendarDays,
    LucideSparkles,
    LucideUpload,
    LucideUsers,
    LucideVideo,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly shell = inject(AppShellStore);
}
