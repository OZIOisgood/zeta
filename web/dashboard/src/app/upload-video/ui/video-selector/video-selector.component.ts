import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TuiLink } from '@taiga-ui/core';
import {
  TuiAvatar,
  type TuiFileLike,
  TuiFiles,
  TuiInputFiles,
  TuiInputFilesDirective,
} from '@taiga-ui/kit';

@Component({
  selector: 'app-video-selector',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiAvatar,
    TuiFiles,
    TuiLink,
    TuiInputFiles,
    TuiInputFilesDirective,
  ],
  templateUrl: './video-selector.component.html',
  styleUrl: './video-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoSelectorComponent {
  @Input({ required: true })
  control!: FormControl<TuiFileLike[] | null>;

  protected remove(file: TuiFileLike): void {
    this.control.setValue(
      this.control.value?.filter((current) => current.name !== file.name) ?? [],
    );
  }
}
