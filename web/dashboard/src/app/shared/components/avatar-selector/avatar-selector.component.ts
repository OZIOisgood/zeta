import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { TuiButton, TuiLabel } from '@taiga-ui/core';

@Component({
  selector: 'app-avatar-selector',
  standalone: true,
  imports: [CommonModule, TuiButton, TuiLabel],
  templateUrl: './avatar-selector.component.html',
  styleUrls: ['./avatar-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarSelectorComponent implements OnChanges {
  @Input() initialAvatar: string | null = null;
  @Input() disabled = false;
  @Output() avatarChange = new EventEmitter<string | null>();

  protected avatarPreview = signal<string | null>(null);
  protected selectedFile = signal<File | null>(null);
  protected compressionError = signal<string | null>(null);

  protected readonly MAX_AVATAR_SIZE = 300 * 1024; // 300KB in bytes

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialAvatar'] && changes['initialAvatar'].currentValue) {
      this.avatarPreview.set(changes['initialAvatar'].currentValue);
    }
  }

  protected onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.onAvatarSelected(input.files);
  }

  protected onAvatarSelected(files: FileList | null): void {
    if (!files || files.length === 0) {
      // If user cancels selection, keep previous state or clear?
      // Usually cancelling file dialog does not clear current selection in most apps, but here we might just return.
      // If we want to allow clearing, we need a clear button.
      // For now, let's just ignore if no file selected (cancel).
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
          this.avatarChange.emit(null);
          return;
        }

        this.compressionError.set(null);
        this.avatarPreview.set(base64);
        this.avatarChange.emit(base64);
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
}
