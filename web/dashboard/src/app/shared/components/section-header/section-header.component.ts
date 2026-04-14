import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TuiSkeleton } from '@taiga-ui/kit';

@Component({
  selector: 'app-section-header',
  standalone: true,
  imports: [TuiSkeleton],
  template: `
    <h2 class="section-title tui-text_h4" [tuiSkeleton]="loading ? title : ''">
      {{ loading ? '' : title }}
    </h2>
    <ng-content></ng-content>
  `,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.5rem;
      }

      .section-title {
        margin: 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionHeaderComponent {
  @Input() title = '';
  @Input() loading = false;
}
