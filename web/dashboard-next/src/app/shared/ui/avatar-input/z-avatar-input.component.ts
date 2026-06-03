import { NgClass } from '@angular/common';
import { Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideImage, LucideUpload } from '@lucide/angular';
import { ZButtonComponent } from '../button/z-button.component';

@Component({
  selector: 'z-avatar-input',
  imports: [NgClass, ZButtonComponent, LucideImage, LucideUpload],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ZAvatarInputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="grid gap-2">
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm font-semibold">
          {{ label() }}
          @if (required()) {
            <span class="text-[var(--z-primary)]" aria-hidden="true">*</span>
          }
        </span>
        @if (preview()) {
          <span class="text-xs font-medium text-[var(--z-muted)]">{{ previewLabel() }}</span>
        }
      </div>

      <div
        class="grid gap-3 rounded-lg border bg-white p-3 transition sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
        [ngClass]="
          visibleError()
            ? 'border-rose-300 bg-rose-50/40'
            : 'border-[var(--z-border)] hover:border-[var(--z-primary-soft)]'
        "
      >
        <span
          class="grid size-16 place-items-center overflow-hidden rounded-lg border border-[var(--z-border)] bg-[var(--z-surface-warm)] text-[var(--z-primary)]"
        >
          @if (preview(); as previewUrl) {
            <img class="size-full object-cover" [src]="previewUrl" [alt]="previewLabel()" />
          } @else {
            <svg lucideImage class="size-7" aria-hidden="true"></svg>
          }
        </span>

        <div class="min-w-0">
          <p class="text-sm font-semibold">{{ helperTitle() }}</p>
          <p class="mt-1 text-xs leading-5 text-[var(--z-muted)]">{{ helperText() }}</p>
          @if (selectedFileName(); as fileName) {
            <p class="mt-1 truncate text-xs font-medium text-[var(--z-primary)]">
              {{ fileName }}
            </p>
          }
          @if (visibleError(); as message) {
            <p class="mt-2 text-xs font-medium text-rose-700" role="alert">{{ message }}</p>
          }
        </div>

        <input
          #fileInput
          class="sr-only"
          type="file"
          accept="image/*"
          [disabled]="isDisabled()"
          (change)="onFileInputChange($event)"
        />

        <z-button
          type="button"
          variant="secondary"
          [disabled]="isDisabled()"
          (pressed)="fileInput.click()"
        >
          <svg lucideUpload class="size-4" aria-hidden="true"></svg>
          <span>{{ selectLabel() }}</span>
        </z-button>
      </div>
    </div>
  `,
})
export class ZAvatarInputComponent implements ControlValueAccessor {
  readonly label = input('Avatar');
  readonly helperTitle = input('Group image');
  readonly helperText = input('Upload a square image. It will be compressed before saving.');
  readonly previewLabel = input('Avatar preview');
  readonly selectLabel = input('Select image');
  readonly invalidImageMessage = input('Please select a valid image file');
  readonly sizeExceededMessage = input('Image size {{size}}KB exceeds 300KB limit');
  readonly loadFailedMessage = input('Failed to load image');
  readonly readFailedMessage = input('Failed to read file');
  readonly errorMessage = input<string | null>(null);
  readonly required = input(false);
  readonly disabled = input(false);

  private readonly maxAvatarSize = 300 * 1024;
  private readonly value = signal<string | null>(null);
  private readonly controlDisabled = signal(false);
  protected readonly selectedFileName = signal<string | null>(null);
  protected readonly fileError = signal<string | null>(null);

  protected readonly isDisabled = computed(() => this.disabled() || this.controlDisabled());
  protected readonly visibleError = computed(() => this.fileError() || this.errorMessage());
  protected readonly preview = computed(() => {
    const avatar = this.value();
    if (!avatar) {
      return null;
    }

    return avatar.startsWith('data:') ? avatar : `data:image/jpeg;base64,${avatar}`;
  });

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(this.stripDataUrl(value));
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.controlDisabled.set(isDisabled);
  }

  protected onFileInputChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.onAvatarSelected(inputElement.files);
    inputElement.value = '';
  }

  private onAvatarSelected(files: FileList | null): void {
    this.onTouched();

    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      this.fileError.set(this.invalidImageMessage());
      return;
    }

    this.selectedFileName.set(file.name);
    this.compressAndPreview(file);
  }

  private compressAndPreview(file: File): void {
    const reader = new FileReader();

    reader.onload = (event) => {
      const image = new Image();
      image.onload = () => {
        const canvas = this.compressImage(image);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const sizeInBytes = Math.ceil((dataUrl.length * 3) / 4);

        if (sizeInBytes > this.maxAvatarSize) {
          this.fileError.set(
            this.sizeExceededMessage().replace('{{size}}', (sizeInBytes / 1024).toFixed(2)),
          );
          this.selectedFileName.set(null);
          return;
        }

        this.commitValue(dataUrl);
      };

      image.onerror = () => {
        this.fileError.set(this.loadFailedMessage());
        this.selectedFileName.set(null);
      };

      image.src = event.target?.result as string;
    };

    reader.onerror = () => {
      this.fileError.set(this.readFailedMessage());
      this.selectedFileName.set(null);
    };

    reader.readAsDataURL(file);
  }

  private compressImage(
    image: HTMLImageElement,
    maxWidth = 256,
    maxHeight = 256,
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    let width = image.width;
    let height = image.height;

    if (width > height && width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    } else if (height > maxHeight) {
      width = Math.round((width * maxHeight) / height);
      height = maxHeight;
    }

    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')?.drawImage(image, 0, 0, width, height);

    return canvas;
  }

  private commitValue(dataUrl: string): void {
    const value = this.stripDataUrl(dataUrl);
    this.fileError.set(null);
    this.value.set(value);
    this.onChange(value);
    this.onTouched();
  }

  private stripDataUrl(value: string | null): string | null {
    if (!value) {
      return null;
    }

    return value.split(',')[1] || value;
  }
}
