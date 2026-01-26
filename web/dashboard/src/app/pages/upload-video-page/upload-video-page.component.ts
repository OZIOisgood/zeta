import { CommonModule } from '@angular/common';
import { HttpClient, HttpEventType } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { TuiStringHandler } from '@taiga-ui/cdk';
import { TuiButton, TuiTextfield } from '@taiga-ui/core';
import {
  TuiAvatar,
  TuiChevron,
  TuiDataListWrapper,
  TuiFileLike,
  TuiFiles,
  TuiSelect,
  TuiSlides,
  TuiStep,
  TuiStepper,
} from '@taiga-ui/kit';
import { forkJoin, Observable, tap } from 'rxjs';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import {
  AssetService,
  CreateAssetResponse,
  VideoResponse,
} from '../../shared/services/asset.service';
import { Group, GroupsService } from '../../shared/services/groups.service';
import { VideoDetailsComponent } from './ui/video-details/video-details.component';
import { VideoSelectorComponent } from './ui/video-selector/video-selector.component';

@Component({
  selector: 'app-upload-video-page',
  standalone: true,
  imports: [
    CommonModule,
    PageContainerComponent,
    ReactiveFormsModule,
    FormsModule,
    TuiButton,
    TuiStepper,
    TuiStep,
    TuiFiles,
    TuiSlides,
    TuiSelect,
    TuiDataListWrapper,
    TuiTextfield,
    TuiChevron,
    TuiAvatar,
    VideoSelectorComponent,
    VideoDetailsComponent,
  ],
  templateUrl: './upload-video-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadVideoPageComponent implements OnInit {
  private readonly assetService = inject(AssetService);
  private readonly groupsService = inject(GroupsService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected slideDirection = 1;
  protected activeIndex = 0;
  protected readonly filesControl = new FormControl<File[]>([]);
  protected readonly detailsForm = new FormGroup({
    title: new FormControl('', Validators.required),
    description: new FormControl(''),
    group: new FormControl<Group | null>(null),
  });

  protected groups: Group[] = [];
  protected readonly groupStringify: TuiStringHandler<Group> = (item: Group) => item.name;

  ngOnInit(): void {
    this.groupsService.list().subscribe((groups) => {
      this.groups = groups;
      this.cdr.markForCheck();
    });
  }

  protected uploadingFiles: TuiFileLike[] = [];
  protected completedFiles: TuiFileLike[] = [];
  protected failedFiles: TuiFileLike[] = [];

  protected isUploadComplete = false;
  protected isUploading = false;

  protected onActiveIndexChange(index: number): void {
    this.slideDirection = index > this.activeIndex ? 1 : -1;
    this.activeIndex = index;
  }

  protected get isFilesSelected(): boolean {
    return !!this.filesControl.value?.length;
  }

  protected onNext(): void {
    this.slideDirection = 1;

    if (this.activeIndex === 0) {
      this.activeIndex = 1;
    } else if (this.activeIndex === 1) {
      this.startUpload();
    } else if (this.activeIndex === 2 && this.isUploadComplete) {
      this.router.navigate(['/']);
    }
  }

  protected onBack(): void {
    this.slideDirection = -1;

    if (this.activeIndex > 0 && !this.isUploading) {
      this.activeIndex--;
    }
  }

  private startUpload(): void {
    const files = this.filesControl.value;
    const { title, description, group } = this.detailsForm.value;

    if (!files || !files.length || !title) return;

    this.activeIndex = 2;
    this.isUploading = true;

    // Initialize loading state
    this.uploadingFiles = files.map((f) => ({
      name: f.name,
    }));

    const filenames = files.map((f) => f.name);

    this.assetService.createAsset(title, description || '', filenames, group?.id).subscribe({
      next: (response: CreateAssetResponse) => {
        const uploads = response.videos
          .map((video: VideoResponse) => {
            const file = files.find((f) => f.name === video.filename);
            if (!file) return null;
            return this.uploadFile(file, video.upload_url);
          })
          .filter(Boolean) as Observable<any>[];

        forkJoin(uploads).subscribe({
          next: () => {
            this.isUploadComplete = true;
            this.isUploading = false;
            this.uploadingFiles = [];
            this.cdr.markForCheck();
          },
          error: (err: unknown) => {
            console.error('Upload failed', err);
            this.isUploading = false;
            // Handle error more gracefully in real app (move files to failedFiles)
            this.cdr.markForCheck();
          },
        });
      },
      error: (err: unknown) => {
        console.error('Failed to create asset', err);
        this.isUploading = false;
        this.activeIndex = 1; // Go back to details
        this.cdr.markForCheck();
      },
    });
  }

  private uploadFile(file: File, url: string): Observable<any> {
    return this.http
      .put(url, file, {
        reportProgress: true,
        observe: 'events',
      })
      .pipe(
        tap((event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            const progress = Math.round((100 * event.loaded) / event.total);
            this.updateFileProgress(file.name, progress);
          }
        }),
        tap((event) => {
          if (event.type === HttpEventType.Response) {
            this.markAsCompleted(file.name);
          }
        }),
      );
  }

  private updateFileProgress(filename: string, progress: number): void {
    const index = this.uploadingFiles.findIndex((f) => f.name === filename);
    if (index !== -1) {
      // We don't want to show progress text, so just trigger change detection if needed
      this.cdr.markForCheck();
    }
  }

  private markAsCompleted(filename: string): void {
    const index = this.uploadingFiles.findIndex((f) => f.name === filename);
    if (index !== -1) {
      const file = this.uploadingFiles[index];
      // Remove from uploading
      const newUploading = [...this.uploadingFiles];
      newUploading.splice(index, 1);
      this.uploadingFiles = newUploading;

      // Add to completed
      this.completedFiles = [...this.completedFiles, { name: filename }];
      this.cdr.markForCheck();
    }
  }
}
