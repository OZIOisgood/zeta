import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiButton, TuiDialogContext, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { TuiCheckbox } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

export interface BlockedSlotDialogResult {
  blocked_date: string;
  start_time?: string;
  end_time?: string;
  reason?: string;
}

@Component({
  selector: 'app-blocked-slot-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TuiButton, TuiLabel, TuiTextfield, TuiCheckbox],
  templateUrl: './blocked-slot-dialog.component.html',
  styleUrls: ['./blocked-slot-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlockedSlotDialogComponent {
  private readonly context =
    injectContext<TuiDialogContext<BlockedSlotDialogResult | null, void>>();

  protected readonly form = new FormGroup({
    blocked_date: new FormControl('', [Validators.required]),
    full_day: new FormControl(true),
    start_time: new FormControl(''),
    end_time: new FormControl(''),
    reason: new FormControl(''),
  });

  protected onSubmit(): void {
    if (this.form.invalid) return;

    const result: BlockedSlotDialogResult = {
      blocked_date: this.form.value.blocked_date!,
    };

    if (!this.form.value.full_day) {
      result.start_time = this.form.value.start_time || undefined;
      result.end_time = this.form.value.end_time || undefined;
    }

    if (this.form.value.reason) {
      result.reason = this.form.value.reason;
    }

    this.context.completeWith(result);
  }

  protected onCancel(): void {
    this.context.$implicit.complete();
  }
}
