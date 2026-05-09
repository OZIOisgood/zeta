import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TuiButton, TuiDialogContext, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { TuiDataListWrapper, TuiSelect } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';
import { SessionType } from '../../../../shared/services/coaching.service';

export interface SessionTypeDialogData {
  sessionType: SessionType | null;
  durationOptions: number[];
}

export interface SessionTypeDialogResult {
  name: string;
  description: string;
  duration_minutes: number;
}

@Component({
  selector: 'app-session-type-dialog',
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
  templateUrl: './session-type-dialog.component.html',
  styleUrls: ['./session-type-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionTypeDialogComponent {
  private readonly context =
    injectContext<TuiDialogContext<SessionTypeDialogResult | null, SessionTypeDialogData>>();
  private readonly translate = inject(TranslateService);

  protected get isEditing(): boolean {
    return !!this.context.data.sessionType;
  }

  protected readonly durationOptions = this.context.data.durationOptions;

  protected readonly durationStringify = (val: number): string =>
    this.translate.instant('common.labels.minutesShort', { count: val });

  protected readonly form = new FormGroup({
    name: new FormControl(this.context.data.sessionType?.name ?? '', [Validators.required]),
    description: new FormControl(this.context.data.sessionType?.description ?? ''),
    duration_minutes: new FormControl(this.context.data.sessionType?.duration_minutes ?? 30, [
      Validators.required,
    ]),
  });

  protected onSubmit(): void {
    if (this.form.invalid) return;

    this.context.completeWith({
      name: this.form.value.name!,
      description: this.form.value.description ?? '',
      duration_minutes: this.form.value.duration_minutes!,
    });
  }

  protected onCancel(): void {
    this.context.$implicit.complete();
  }
}
