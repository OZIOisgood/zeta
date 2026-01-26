import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TuiButton, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import { GroupsService } from '../../shared/services/groups.service';

@Component({
  selector: 'app-create-group-page',
  standalone: true,
  imports: [
    CommonModule,
    PageContainerComponent,
    ReactiveFormsModule,
    TuiButton,
    TuiLabel,
    TuiTextfield,
  ],
  templateUrl: './create-group-page.component.html',
  styleUrls: ['./create-group-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateGroupPageComponent {
  private readonly groupsService = inject(GroupsService);
  private readonly router = inject(Router);

  protected readonly form = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(1)]),
  });

  protected isSubmitting = false;
  protected avatarPreview = signal<string | null>(null);
  protected selectedFile = signal<File | null>(null);
  protected compressionError = signal<string | null>(null);

  protected readonly MAX_AVATAR_SIZE = 300 * 1024; // 300KB in bytes

  protected onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.onAvatarSelected(input.files);
  }

  protected onAvatarSelected(files: FileList | null): void {
    if (!files || files.length === 0) {
      this.selectedFile.set(null);
      this.avatarPreview.set(null);
      this.compressionError.set(null);
      return;
    }

    const file = files[0];

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.compressionError.set('Please select a valid image file');
      return;
    }

    this.selectedFile.set(file);
    this.compressAndPreview(file);
  }

  private compressAndPreview(file: File): void {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = this.compressImage(img);
        const base64 = canvas.toDataURL('image/jpeg', 0.8);

        // Check size after compression
        const sizeInBytes = Math.ceil((base64.length * 3) / 4);
        if (sizeInBytes > this.MAX_AVATAR_SIZE) {
          this.compressionError.set(
            `Image size ${(sizeInBytes / 1024).toFixed(2)}KB exceeds 300KB limit`,
          );
          this.selectedFile.set(null);
          this.avatarPreview.set(null);
          return;
        }

        this.compressionError.set(null);
        this.avatarPreview.set(base64);
      };

      img.onerror = () => {
        this.compressionError.set('Failed to load image');
        this.selectedFile.set(null);
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      this.compressionError.set('Failed to read file');
      this.selectedFile.set(null);
    };

    reader.readAsDataURL(file);
  }

  private compressImage(img: HTMLImageElement, maxWidth = 256, maxHeight = 256): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    let width = img.width;
    let height = img.height;

    if (width > height) {
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(img, 0, 0, width, height);

    return canvas;
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSubmitting || this.compressionError()) {
      return;
    }

    const name = this.form.get('name')?.value;
    if (!name) {
      return;
    }

    this.isSubmitting = true;

    // Strip the data URI prefix to get just the base64 string
    let avatarBase64: string | undefined;
    const preview = this.avatarPreview();
    if (preview) {
      // Remove "data:image/jpeg;base64," or similar prefix
      avatarBase64 = preview.split(',')[1];
    }

    this.groupsService.create(name, avatarBase64).subscribe({
      next: () => {
        this.router.navigate(['/groups']);
      },
      error: (error) => {
        console.error('Failed to create group:', error);
        this.isSubmitting = false;
      },
    });
  }

  protected onCancel(): void {
    this.router.navigate(['/groups']);
  }
}
