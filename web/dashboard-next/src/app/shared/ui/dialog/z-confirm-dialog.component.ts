import { Component, input, output } from '@angular/core';
import { ZActionDialogComponent } from './z-action-dialog.component';

type DialogTone = 'danger' | 'warning' | 'info';
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

@Component({
  selector: 'z-confirm-dialog',
  imports: [ZActionDialogComponent],
  template: `
    <z-action-dialog
      [title]="title()"
      [description]="description()"
      [tone]="tone()"
      [confirmLabel]="confirmLabel()"
      [cancelLabel]="cancelLabel()"
      [confirmOnly]="confirmOnly()"
      [confirmVariant]="confirmVariant()"
      [cancelVariant]="cancelVariant()"
      [confirmDisabled]="confirmDisabled()"
      [cancelDisabled]="cancelDisabled()"
      [confirmResult]="confirmResult()"
      [cancelResult]="cancelResult()"
      [close]="close()"
      (confirmed)="confirmed.emit()"
      (cancelled)="cancelled.emit()"
    />
  `,
})
export class ZConfirmDialogComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  // Dialog close results vary by trigger consumer.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly close = input.required<(result?: any) => void>();
  readonly tone = input<DialogTone>('warning');
  readonly confirmLabel = input.required<string>();
  readonly cancelLabel = input('');
  readonly confirmOnly = input(false);
  readonly confirmVariant = input<ButtonVariant | null>(null);
  readonly cancelVariant = input<ButtonVariant>('secondary');
  readonly confirmDisabled = input(false);
  readonly cancelDisabled = input(false);
  readonly confirmResult = input<unknown>(true);
  readonly cancelResult = input<unknown>(false);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
