import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TuiItem } from '@taiga-ui/cdk';
import { TuiLink } from '@taiga-ui/core';
import { TuiBreadcrumbs } from '@taiga-ui/kit';

export interface BreadcrumbItem {
  label: string;
  routerLink?: string;
}

@Component({
  selector: 'app-breadcrumbs',
  standalone: true,
  imports: [CommonModule, RouterLink, TuiBreadcrumbs, TuiItem, TuiLink],
  template: `
    <tui-breadcrumbs size="l">
      <ng-container *ngFor="let item of items; let last = last">
        <a *tuiItem tuiLink [routerLink]="item.routerLink" [class.last]="last">
          {{ item.label }}
        </a>
      </ng-container>
    </tui-breadcrumbs>
  `,
  styles: [
    `
      :host {
        display: block;
        margin-bottom: 1rem;
      }

      .last {
        font-weight: bold;
        color: var(--tui-text-primary);
        pointer-events: none;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbsComponent {
  @Input({ required: true }) items: BreadcrumbItem[] = [];
}
