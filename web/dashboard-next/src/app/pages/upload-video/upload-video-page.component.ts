import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  LucideAlertCircle,
  LucideCheck,
  LucideFileVideo,
  LucideUpload,
  LucideX,
} from '@lucide/angular';
import { forkJoin } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AssetsApiClient } from '../../core/http/assets-api.service';
import { SurgeService } from '../../core/http/surge.service';
import { GroupsStore } from '../../features/groups/groups.store';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZSelectComponent } from '../../shared/ui/select/z-select.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';
import { ZStepperComponent, type StepperStep } from '../../shared/ui/stepper/z-stepper.component';
import { ZTextInputComponent } from '../../shared/ui/text-input/z-text-input.component';
import { ZTextareaComponent } from '../../shared/ui/textarea/z-textarea.component';

type UploadStep = 'files' | 'details' | 'review';
type UploadPhase = 'idle' | 'uploading' | 'success' | 'error';

@Component({
  selector: 'app-upload-video-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslocoPipe,
    ZBadgeComponent,
    ZButtonComponent,
    ZSelectComponent,
    ZSkeletonComponent,
    ZStepperComponent,
    ZTextInputComponent,
    ZTextareaComponent,
    LucideAlertCircle,
    LucideCheck,
    LucideFileVideo,
    LucideUpload,
    LucideX,
  ],
  template: `
    <div class="grid min-w-0 gap-6">
      <section class="rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm">
        <h2 class="text-2xl font-semibold sm:text-3xl">{{ 'upload.title' | transloco }}</h2>
        <p class="mt-2 text-sm leading-6 text-[var(--z-muted)]">
          {{ 'upload.summary' | transloco }}
        </p>
      </section>

      <z-stepper [steps]="stepperSteps()" (stepClick)="handleStepClick($event)" />

      @if (activeStep() === 'files') {
        <section
          class="grid gap-4 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm"
        >
          <label
            class="grid min-h-56 cursor-pointer place-items-center rounded-lg border border-dashed border-[var(--z-border)] bg-[var(--z-surface-warm)] p-6 text-center transition hover:border-[var(--z-primary-soft)]"
          >
            <input
              class="sr-only"
              type="file"
              multiple
              accept="video/*"
              (change)="onFilesSelected($event)"
            />
            <span class="grid gap-3">
              <span
                class="mx-auto grid size-12 place-items-center rounded-lg bg-white text-[var(--z-primary)]"
              >
                <svg lucideUpload class="size-6" aria-hidden="true"></svg>
              </span>
              <span class="text-sm font-semibold"
                >{{ 'upload.dragDrop' | transloco }} {{ 'upload.clickUpload' | transloco }}</span
              >
              <span class="text-xs text-[var(--z-muted)]">{{
                'upload.multiPartHint' | transloco
              }}</span>
            </span>
          </label>

          @if (files().length > 0) {
            <div class="grid gap-2">
              @for (file of files(); track file.name) {
                <div
                  class="flex min-w-0 items-center gap-3 rounded-md border border-[var(--z-border)] p-3"
                >
                  <svg
                    lucideFileVideo
                    class="size-5 shrink-0 text-[var(--z-primary)]"
                    aria-hidden="true"
                  ></svg>
                  <span class="min-w-0 flex-1 truncate text-sm font-semibold">{{ file.name }}</span>
                  <z-badge>{{ sizeLabel(file.size) }}</z-badge>
                  <button
                    type="button"
                    class="grid size-8 shrink-0 place-items-center rounded-md text-[var(--z-muted)] transition hover:bg-[var(--z-surface-warm)] hover:text-[var(--z-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)]"
                    [attr.aria-label]="'common.actions.remove' | transloco"
                    (click)="removeFile(file)"
                  >
                    <svg lucideX class="size-4" aria-hidden="true"></svg>
                  </button>
                </div>
              }
            </div>
          }

          <div class="flex justify-end">
            <z-button [disabled]="files().length === 0" (pressed)="activeStep.set('details')">
              {{ 'common.actions.next' | transloco }}
            </z-button>
          </div>
        </section>
      }

      @if (activeStep() === 'details') {
        <form
          class="grid gap-4 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm"
          [formGroup]="form"
        >
          <label class="grid gap-2">
            <span class="text-sm font-semibold">{{ 'common.fields.title' | transloco }}</span>
            <z-text-input
              formControlName="title"
              [placeholder]="'upload.titlePlaceholder' | transloco"
            />
          </label>

          <label class="grid gap-2">
            <span class="text-sm font-semibold">{{ 'common.fields.description' | transloco }}</span>
            <z-textarea
              formControlName="description"
              [placeholder]="'upload.descriptionPlaceholder' | transloco"
            />
          </label>

          <div class="grid gap-2">
            <span class="text-sm font-semibold">{{ 'common.fields.group' | transloco }}</span>
            @if (groups.status() === 'loading') {
              <z-skeleton class="block h-11 w-full"></z-skeleton>
            } @else {
              <z-select
                [value]="form.controls.groupId.value"
                [options]="groupOptions()"
                [placeholder]="'upload.chooseGroup' | transloco"
                (valueChange)="form.controls.groupId.setValue($event)"
              />
            }
          </div>

          <div class="flex justify-end gap-2">
            <z-button variant="secondary" type="button" (pressed)="activeStep.set('files')">
              {{ 'common.actions.back' | transloco }}
            </z-button>
            <z-button type="button" [disabled]="form.invalid" (pressed)="activeStep.set('review')">
              {{ 'common.actions.next' | transloco }}
            </z-button>
          </div>
        </form>
      }

      @if (activeStep() === 'review') {
        <section
          class="grid gap-4 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm"
        >
          @if (uploadPhase() === 'idle') {
            <div class="flex items-center gap-3">
              <span
                class="grid size-10 place-items-center rounded-md bg-[var(--z-surface-warm)] text-[var(--z-primary)]"
              >
                <svg lucideCheck class="size-5" aria-hidden="true"></svg>
              </span>
              <div>
                <h3 class="text-base font-semibold">{{ 'upload.readyTitle' | transloco }}</h3>
                <p class="mt-1 text-sm text-[var(--z-muted)]">
                  {{ 'upload.readySummary' | transloco }}
                </p>
              </div>
            </div>

            <div class="grid gap-2 rounded-md border border-[var(--z-border)] p-3 text-sm">
              <p>
                <strong>{{ 'common.fields.title' | transloco }}:</strong>
                {{ form.controls.title.value }}
              </p>
              <p>
                <strong>{{ 'common.fields.group' | transloco }}:</strong> {{ selectedGroupName() }}
              </p>
              <p>
                <strong>{{ 'upload.selectVideo' | transloco }}:</strong> {{ files().length }}
              </p>
            </div>

            <div class="flex justify-end gap-2">
              <z-button variant="secondary" type="button" (pressed)="activeStep.set('details')">
                {{ 'common.actions.back' | transloco }}
              </z-button>
              <z-button (pressed)="startUpload()">
                {{ 'upload.startUpload' | transloco }}
              </z-button>
            </div>
          }

          @if (uploadPhase() === 'uploading') {
            <div class="flex items-center gap-3">
              <span
                class="grid size-10 place-items-center rounded-md bg-[var(--z-surface-warm)] text-[var(--z-primary)]"
              >
                <svg lucideUpload class="size-5 animate-bounce" aria-hidden="true"></svg>
              </span>
              <h3 class="text-base font-semibold">{{ 'upload.uploading' | transloco }}</h3>
            </div>

            <div class="grid gap-3">
              @for (file of files(); track file.name) {
                <div class="grid gap-1.5">
                  <div class="flex items-center justify-between gap-2 text-sm">
                    <span class="flex min-w-0 items-center gap-2">
                      <svg
                        lucideFileVideo
                        class="size-4 shrink-0 text-[var(--z-primary)]"
                        aria-hidden="true"
                      ></svg>
                      <span class="truncate font-semibold">{{ file.name }}</span>
                    </span>
                    <span class="shrink-0 text-xs text-[var(--z-muted)]"
                      >{{ pct(file.name) }}%</span
                    >
                  </div>
                  <div class="h-1.5 w-full overflow-hidden rounded-full bg-orange-100">
                    <div
                      class="h-full rounded-full bg-[var(--z-primary)] transition-all duration-300"
                      [style.width.%]="pct(file.name)"
                    ></div>
                  </div>
                </div>
              }
            </div>
          }

          @if (uploadPhase() === 'success') {
            <div class="grid justify-items-center gap-4 py-4 text-center">
              <span class="grid size-14 place-items-center rounded-full bg-green-50 text-green-600">
                <svg lucideCheck class="size-7" aria-hidden="true"></svg>
              </span>
              <div>
                <h3 class="text-base font-semibold">{{ 'upload.uploadSuccess' | transloco }}</h3>
                <p class="mt-1 text-sm text-[var(--z-muted)]">
                  {{ 'upload.uploadSuccessDescription' | transloco }}
                </p>
              </div>
              <a
                [routerLink]="['/asset', createdAssetId()]"
                class="inline-flex min-h-9 items-center justify-center rounded-md bg-[var(--z-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--z-primary-strong)]"
              >
                {{ 'upload.viewVideo' | transloco }}
              </a>
            </div>
          }

          @if (uploadPhase() === 'error') {
            <div class="grid gap-4 rounded-md border border-rose-200 bg-rose-50 p-4">
              <div class="flex items-start gap-3">
                <svg
                  lucideAlertCircle
                  class="mt-0.5 size-5 shrink-0 text-rose-600"
                  aria-hidden="true"
                ></svg>
                <div>
                  <p class="text-sm font-semibold text-rose-700">
                    {{ 'upload.uploadFailed' | transloco }}
                  </p>
                  @if (uploadError()) {
                    <p class="mt-1 text-xs text-rose-600">{{ uploadError() }}</p>
                  }
                </div>
              </div>
              <div class="flex justify-end gap-2">
                <z-button variant="secondary" type="button" (pressed)="activeStep.set('details')">
                  {{ 'common.actions.back' | transloco }}
                </z-button>
                <z-button (pressed)="startUpload()">
                  {{ 'upload.retry' | transloco }}
                </z-button>
              </div>
            </div>
          }
        </section>
      }
    </div>
  `,
})
export class UploadVideoPageComponent {
  protected readonly groups = inject(GroupsStore);
  private readonly assets = inject(AssetsApiClient);
  private readonly surge = inject(SurgeService);
  private readonly router = inject(Router);
  private readonly t = inject(TranslocoService);

  protected readonly groupOptions = computed(() =>
    this.groups.groups().map((g) => ({ value: g.id, label: g.name })),
  );
  protected readonly activeStep = signal<UploadStep>('files');
  protected readonly stepperSteps = computed<StepperStep[]>(() => {
    const activeIndex = this.steps.findIndex((s) => s.value === this.activeStep());
    return this.steps.map((s, i) => ({
      label: this.t.translate(s.labelKey),
      state: i < activeIndex ? 'completed' : i === activeIndex ? 'active' : 'upcoming',
    }));
  });
  protected readonly files = signal<File[]>([]);
  protected readonly uploadPhase = signal<UploadPhase>('idle');
  protected readonly uploadError = signal<string | null>(null);
  protected readonly createdAssetId = signal<string | null>(null);
  protected readonly fileProgressMap = signal(new Map<string, number>());
  protected readonly steps: { value: UploadStep; labelKey: string }[] = [
    { value: 'files', labelKey: 'upload.selectVideo' },
    { value: 'details', labelKey: 'upload.enterDetails' },
    { value: 'review', labelKey: 'upload.upload' },
  ];
  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
    groupId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor() {
    if (this.groups.status() === 'idle') {
      void this.groups.loadGroups();
    }
  }

  protected handleStepClick(index: number): void {
    const step = this.steps[index];
    if (step) this.setStep(step.value);
  }

  protected setStep(value: string): void {
    if (this.uploadPhase() === 'uploading') return;
    if (value === 'details' && this.files().length === 0) return;
    if (value === 'review' && this.form.invalid) return;
    if (value === 'files' || value === 'details' || value === 'review') {
      if (value !== 'review') this.uploadPhase.set('idle');
      this.activeStep.set(value);
    }
  }

  protected startUpload(): void {
    const { title, description, groupId } = this.form.getRawValue();
    const files = this.files();

    this.uploadPhase.set('uploading');
    this.uploadError.set(null);
    this.fileProgressMap.set(new Map(files.map((f) => [f.name, 0])));

    this.assets
      .createAsset({
        title,
        description,
        filenames: files.map((f) => f.name),
        group_id: groupId || undefined,
      })
      .subscribe({
        next: (response) => {
          this.createdAssetId.set(response.asset_id);

          const uploads = response.videos
            .map((video) => {
              const file = files.find((f) => f.name === video.filename);
              if (!file) return null;
              return this.surge
                .upload({ file, url: video.upload_url, options: { chunkSize: 8 * 1024 * 1024 } })
                .pipe(
                  tap((event) => {
                    if (event.type === 'progress') {
                      this.fileProgressMap.update((m) =>
                        new Map(m).set(file.name, event.percentage),
                      );
                    }
                  }),
                );
            })
            .filter((u) => u !== null);

          forkJoin(uploads).subscribe({
            next: () => {
              this.assets.completeUpload(response.asset_id).subscribe({
                next: () => this.uploadPhase.set('success'),
                error: (err: unknown) => {
                  this.uploadPhase.set('error');
                  this.uploadError.set(this.errorMessage(err));
                },
              });
            },
            error: (err: unknown) => {
              this.uploadPhase.set('error');
              this.uploadError.set(this.errorMessage(err));
            },
          });
        },
        error: (err: unknown) => {
          this.uploadPhase.set('error');
          this.uploadError.set(this.errorMessage(err));
        },
      });
  }

  protected pct(filename: string): number {
    return Math.round(this.fileProgressMap().get(filename) ?? 0);
  }

  private errorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) return err.error?.message || err.message;
    if (err instanceof Error) return err.message;
    return 'Upload failed. Please try again.';
  }

  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selectedFiles = Array.from(input.files ?? []);

    this.files.update((currentFiles) => {
      const fileMap = new Map(currentFiles.map((file) => [this.fileKey(file), file]));

      for (const file of selectedFiles) {
        fileMap.set(this.fileKey(file), file);
      }

      return Array.from(fileMap.values());
    });

    input.value = '';
  }

  protected removeFile(fileToRemove: File): void {
    const fileKey = this.fileKey(fileToRemove);
    this.files.update((files) => files.filter((file) => this.fileKey(file) !== fileKey));
  }

  protected sizeLabel(size: number): string {
    return `${Math.max(1, Math.round(size / 1024 / 1024))} MB`;
  }

  protected selectedGroupName(): string {
    return (
      this.groups.groups().find((group) => group.id === this.form.controls.groupId.value)?.name ||
      ''
    );
  }

  private fileKey(file: File): string {
    return `${file.name}:${file.size}:${file.lastModified}`;
  }
}
