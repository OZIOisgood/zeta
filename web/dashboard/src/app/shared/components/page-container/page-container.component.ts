import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-page-container',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="tui-container tui-container_adaptive page-container">
    <ng-content></ng-content>
  </div>`,
  styles: [
    `
      .page-container {
        padding-top: 2rem;
        padding-bottom: 2rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageContainerComponent {}
