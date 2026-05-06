import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TuiButton, TuiDialogContext, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { TuiTextarea } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

export interface CancelSessionDialogData {
  otherParty: string;
  scheduledAt: string;
}

export interface CancelSessionDialogResult {
  cancellation_reason?: string;
}

@Component({
  selector: 'app-cancel-session-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TuiButton, TuiLabel, TuiTextfield, TuiTextarea],
  templateUrl: './cancel-session-dialog.component.html',
  styleUrls: ['./cancel-session-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CancelSessionDialogComponent {
  private readonly context =
    injectContext<TuiDialogContext<CancelSessionDialogResult | null, CancelSessionDialogData>>();

  protected readonly data = this.context.data;

  protected readonly form = new FormGroup({
    cancellation_reason: new FormControl('', { nonNullable: true }),
  });

  protected onSubmit(): void {
    const reason = this.form.controls.cancellation_reason.value.trim();

    this.context.completeWith({
      cancellation_reason: reason || undefined,
    });
  }

  protected onCancel(): void {
    this.context.$implicit.complete();
  }
}
