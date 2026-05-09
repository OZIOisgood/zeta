import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiStringHandler } from '@taiga-ui/cdk';
import { TuiButton, TuiDialogContext, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TuiDataListWrapper, TuiSelect } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';
import { CoachingAvailability } from '../../../../shared/services/coaching.service';
import { orderedWeekdayValues } from '../../../../shared/utils/weekdays';

export interface AvailabilityDialogData {
  availability: CoachingAvailability | null;
  firstDayOfWeek: number;
}

export interface AvailabilityDialogResult {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

@Component({
  selector: 'app-availability-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiButton,
    TuiLabel,
    TuiTextfield,
    TuiSelect,
    TuiDataListWrapper,
    TranslatePipe,
  ],
  templateUrl: './availability-dialog.component.html',
  styleUrls: ['./availability-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvailabilityDialogComponent {
  private readonly context =
    injectContext<TuiDialogContext<AvailabilityDialogResult | null, AvailabilityDialogData>>();
  private readonly translate = inject(TranslateService);

  protected get isEditing(): boolean {
    return !!this.context.data.availability;
  }

  protected readonly dayOptions = orderedWeekdayValues(this.context.data.firstDayOfWeek);
  protected readonly dayStringify: TuiStringHandler<number> = (val: number) =>
    this.translate.instant(`weekdays.${val}`);

  protected readonly form = new FormGroup({
    day_of_week: new FormControl(this.context.data.availability?.day_of_week ?? 1, [
      Validators.required,
    ]),
    start_time: new FormControl(this.context.data.availability?.start_time ?? '09:00', [
      Validators.required,
    ]),
    end_time: new FormControl(this.context.data.availability?.end_time ?? '17:00', [
      Validators.required,
    ]),
  });

  protected onSubmit(): void {
    if (this.form.invalid) return;

    this.context.completeWith({
      day_of_week: this.form.value.day_of_week!,
      start_time: this.form.value.start_time!,
      end_time: this.form.value.end_time!,
    });
  }

  protected onCancel(): void {
    this.context.$implicit.complete();
  }
}
