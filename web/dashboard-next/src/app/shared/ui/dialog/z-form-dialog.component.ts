import { Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ZActionDialogComponent } from './z-action-dialog.component';

@Component({
  selector: 'z-form-dialog',
  imports: [TranslocoPipe, ZActionDialogComponent],
  template: `
    <z-action-dialog
      [title]="title()"
      tone="info"
      [showToneIcon]="false"
      [confirmLabel]="'common.actions.save' | transloco"
      [cancelLabel]="'common.actions.cancel' | transloco"
      [confirmCloses]="false"
      [cancelCloses]="false"
      [close]="noopClose"
      (confirmed)="saved.emit()"
      (cancelled)="cancelled.emit()"
    >
      <div class="mt-4 grid gap-4">
        <ng-content />
      </div>
    </z-action-dialog>
  `,
})
export class ZFormDialogComponent {
  readonly title = input.required<string>();
  readonly cancelled = output<void>();
  readonly saved = output<void>();

  protected readonly noopClose = (): void => undefined;
}
