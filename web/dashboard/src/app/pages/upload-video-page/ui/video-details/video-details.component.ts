import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { TuiTextarea } from '@taiga-ui/kit';
import { Group } from '../../../../shared/services/groups.service';

@Component({
  selector: 'app-video-details',
  standalone: true,
  imports: [ReactiveFormsModule, TuiTextfield, TuiLabel, TuiTextarea],
  templateUrl: './video-details.component.html',
  styleUrl: './video-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoDetailsComponent {
  @Input({ required: true })
  form!: FormGroup<{
    title: FormControl<string | null>;
    description: FormControl<string | null>;
    group: FormControl<Group | null>;
  }>;
}
