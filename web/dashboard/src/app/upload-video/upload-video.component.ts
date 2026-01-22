import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-upload-video',
  standalone: true,
  templateUrl: './upload-video.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadVideoComponent {}
