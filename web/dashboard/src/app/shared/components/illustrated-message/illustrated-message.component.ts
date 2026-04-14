import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TuiButton } from '@taiga-ui/core';
import { TuiBlockStatus } from '@taiga-ui/layout';

export interface IllustratedMessageButton {
  label: string;
  appearance?: 'primary' | 'secondary' | 'outline' | 'flat' | 'destructive';
  routerLink?: string | string[];
}

@Component({
  selector: 'app-illustrated-message',
  standalone: true,
  imports: [CommonModule, TuiBlockStatus, TuiButton, RouterLink],
  template: `
    <tui-block-status size="m">
      <img [alt]="illustrationAlt" [src]="illustrationSrc" tuiSlot="top" class="illustration" />
      <h4>{{ heading }}</h4>
      <span *ngIf="description">{{ description }}</span>
      <div *ngIf="buttons.length > 0" tuiSlot="action" class="actions">
        @for (btn of buttons; track btn.label) {
          @if (btn.routerLink) {
            <a tuiButton [appearance]="btn.appearance || 'primary'" [routerLink]="btn.routerLink">
              {{ btn.label }}
            </a>
          } @else {
            <button
              tuiButton
              type="button"
              [appearance]="btn.appearance || 'primary'"
              (click)="buttonClick.emit(btn)"
            >
              {{ btn.label }}
            </button>
          }
        }
      </div>
    </tui-block-status>
  `,
  styles: [
    `
      :host ::ng-deep tui-block-status .t-block-image img.illustration {
        inline-size: 200px;
        block-size: auto;
      }

      .actions {
        display: flex;
        justify-content: center;
        gap: 0.5rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IllustratedMessageComponent {
  @Input() illustrationSrc = '';
  @Input() illustrationAlt = '';
  @Input() heading = '';
  @Input() description = '';
  @Input() buttons: IllustratedMessageButton[] = [];
  @Output() buttonClick = new EventEmitter<IllustratedMessageButton>();
}
