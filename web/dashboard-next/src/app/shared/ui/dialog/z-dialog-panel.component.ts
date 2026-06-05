import { Component, input } from '@angular/core';
import { ZActionDialogComponent } from './z-action-dialog.component';

type DialogTone = 'danger' | 'warning' | 'info';

@Component({
  selector: 'z-dialog-panel',
  imports: [ZActionDialogComponent],
  template: `
    <z-action-dialog
      [title]="title()"
      [description]="description()"
      [tone]="tone()"
      [confirmLabel]="confirmLabel()"
      [cancelLabel]="cancelLabel()"
      [confirmOnly]="confirmOnly()"
      [close]="close()"
    />
  `,
})
export class ZDialogPanelComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly close = input.required<(result?: boolean) => void>();
  readonly tone = input<DialogTone>('warning');
  readonly confirmLabel = input.required<string>();
  readonly cancelLabel = input('');
  readonly confirmOnly = input(false);
}
