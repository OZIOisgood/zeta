import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiSkeleton } from '@taiga-ui/kit';

@Component({
  selector: 'app-section-header',
  standalone: true,
  imports: [TuiSkeleton, TranslatePipe],
  template: `
    <h2 class="section-title tui-text_h4" [tuiSkeleton]="loading ? title : ''">
      {{ loading ? '' : (title | translate) }}
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
        min-width: 0;
      }

      @media (max-width: 47.9375em) {
        :host {
          flex-direction: column;
          align-items: stretch;
          gap: 0.75rem;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionHeaderComponent {
  @Input() title = '';
  @Input() loading = false;
}
