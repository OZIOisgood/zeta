import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiStep, TuiStepper, type TuiFileLike } from '@taiga-ui/kit';
import { VideoDetailsComponent } from './ui/video-details/video-details.component';
import { VideoSelectorComponent } from './ui/video-selector/video-selector.component';

@Component({
  selector: 'app-upload-video',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TuiButton,
    TuiIcon,
    TuiStepper,
    TuiStep,
    VideoSelectorComponent,
    VideoDetailsComponent,
  ],
  templateUrl: './upload-video.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadVideoComponent {
  protected activeIndex = 0;
  protected readonly filesControl = new FormControl<TuiFileLike[]>([]);
  protected readonly detailsForm = new FormGroup({
    title: new FormControl('', Validators.required),
    description: new FormControl(''),
  });

  protected get isFilesSelected(): boolean {
    return !!this.filesControl.value?.length;
  }
}
